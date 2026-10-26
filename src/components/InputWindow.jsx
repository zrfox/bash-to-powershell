import { useId, useRef, useLayoutEffect } from "react";

import { render } from "../translator/index.js";
import { selectionToErase } from "../utils/placeholderSelection.js";

function InputWindow({
    onRemove,
    languageName,
    setTextHandler,
    nId,
    setActiveWindowIdHandler,
    parsedLine,
    activeWindowId,
    sourceWindowId,
    text,
    registerTextArea,
    activeWindowsBoolean,
}) {
    const inputTextAreaId = useId();
    const textAreaRef = useRef(null);

    // Registers on mount (including newly added windows); the returned cleanup
    // stops observing this textarea when the window is closed.
    useLayoutEffect(() => registerTextArea(textAreaRef.current), [registerTextArea]);

    const isActive = nId === activeWindowId;
    const isSource = nId === sourceWindowId;

    // The source window shows what the user typed; every other window renders
    // the shared parse tree into its own shell.
    const valueText =
        isSource || !activeWindowsBoolean ? text : render(parsedLine, languageName);

    return (
        <div className="input-window">
            <div className="close-button-container">
                <button className="close-button" onClick={onRemove}>
                    x
                </button>
            </div>
            <div>{languageName}</div>
            <label htmlFor={inputTextAreaId}></label>
            <textarea
                ref={textAreaRef}
                id={inputTextAreaId}
                name="inputTextArea"
                onFocus={() => {
                    if (!isActive) setActiveWindowIdHandler(nId, languageName);
                }}
                onKeyDown={e => {
                    // One Backspace/Delete erases a whole placeholder: select it
                    // and let the key delete the selection as it normally would.
                    if (e.key !== "Backspace" && e.key !== "Delete") return;
                    const { value, selectionStart, selectionEnd } = e.target;
                    const range = selectionToErase(value, selectionStart, selectionEnd, e.key === "Delete");
                    if (range) e.target.setSelectionRange(range.start, range.end);
                }}
                onChange={e => {
                    if (isActive) setTextHandler(e.target.value, languageName);
                }}
                value={valueText}
            />
        </div>
    );
}

export default InputWindow;
