import { useId, useRef, useLayoutEffect } from "react";

import { render } from "../translator/index.js";

function InputWindow({
    onRemove,
    languageName,
    setTextHandler,
    nId,
    setActiveWindowIdHandler,
    parsedLine,
    activeWindowId,
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

    // The active window shows what the user typed; every other window renders
    // the shared parse tree into its own shell.
    const valueText =
        isActive || !activeWindowsBoolean ? text : render(parsedLine, languageName);

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
                    if (!isActive) setActiveWindowIdHandler(nId, valueText, languageName);
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
