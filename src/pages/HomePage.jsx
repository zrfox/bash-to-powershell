import { useState } from "react";
import { nanoid } from "nanoid";

import InputWindow from "../components/InputWindow";
import languages from "../data/languages.json";

import { parse } from "../translator/index.js";

import { ENABLED_SHELLS } from "../config/shells";

import { useSyncedTextAreaSize } from "../hooks/useSyncedTextAreaSize";

const PLACEHOLDER_TEXT = "Type a command here and see the equivalent in another window!";

function HomePage() {
    const [inputWindows, setInputWindows] = useState([
        { id: nanoid(), language: "bash" },
        { id: nanoid(), language: "powershell" },
    ]);
    const [dialogOpen, setDialog] = useState(false);
    const [activeWindowId, setActiveWindowId] = useState();
    // State for initial page load. Allows display of placeholder text in all windows.
    const [activeWindowsBoolean, setActiveWindowsBoolean] = useState(false);
    // Text exactly as typed in the active window.
    const [text, setText] = useState(PLACEHOLDER_TEXT);
    // Parse tree of that text. It is shell independent, so every other window
    // renders itself from this one tree instead of re-parsing the input.
    const [parsedLine, setParsedLine] = useState(() => parse("", "bash"));
    // maintains uniform window size for all InputWindows
    const [lockWindows, setLockWindows] = useState(true);
    const registerTextArea = useSyncedTextAreaSize(lockWindows); // must come after lockWindows

    function setActiveWindowIdHandler(windowId, displayedText, languageName) {
        if (!activeWindowsBoolean) {
            // first activation: clear placeholder text
            setText("");
            setParsedLine(parse("", languageName));
            setActiveWindowsBoolean(true);
        } else {
            // keep this window's current content and re-translate the others from it
            setTextHandler(displayedText, languageName);
        }
        setActiveWindowId(windowId);
    }

    function openDialog() {
        setDialog(true);
    }

    function closeDialog() {
        setDialog(false);
    }

    function addInputWindow(languageName) {
        closeDialog();
        setInputWindows(prev => [...prev, { id: nanoid(), language: languageName }]);
    }

    function removeInputWindow(id) {
        setInputWindows(prev => prev.filter(w => w.id !== id));
    }

    // Single entry point for user input: store the raw text and parse it once
    // in the shell it was typed in.
    function setTextHandler(inputText, languageName) {
        setText(inputText);
        setParsedLine(parse(inputText, languageName));
    }

    function setLockWindowsHandler() {
        setLockWindows(prev => !prev);
    }

    return (
        <>
            <div className="outside-input-container-right"></div>
            <div className="input-windows-container">
                <div>
                    <button className="lock-button" onClick={setLockWindowsHandler}>
                        {lockWindows ? "\u{1F512}" : "\u{1F513}"} Window
                    </button>
                </div>
                <div className="add-dialog-container">
                    {dialogOpen ? (
                        <div role="dialog" className="dialogue">
                            {Object.entries(languages)
                                .filter(([languageName]) => ENABLED_SHELLS.some(shell => shell.id === languageName))
                                .map(([languageName]) => (
                                    <button key={languageName} onClick={() => addInputWindow(languageName)}>
                                        {languageName}
                                    </button>
                                ))}
                            <button className="close-button" onClick={closeDialog}>
                                x
                            </button>
                        </div>
                    ) : null}
                    <button className="add-button" onClick={openDialog}>
                        Add
                    </button>
                </div>
                {inputWindows.map(window => (
                    <InputWindow
                        key={window.id}
                        languageName={window.language}
                        onRemove={() => removeInputWindow(window.id)}
                        setTextHandler={setTextHandler}
                        nId={window.id}
                        parsedLine={parsedLine}
                        setActiveWindowIdHandler={setActiveWindowIdHandler}
                        activeWindowId={activeWindowId}
                        text={text}
                        registerTextArea={registerTextArea}
                        activeWindowsBoolean={activeWindowsBoolean}
                    />
                ))}
            </div>
        </>
    );
}

export default HomePage;
