import { useEffect, useState, useId } from "react";
import { nanoid } from "nanoid"

import InputWindow from "../components/InputWindow";
import commands from "../data/commands.json";
import languages from "../data/languages.json";

import { commandTokenToId } from "../utils/commandIndex";
import { commandById } from "../utils/commandIndex";
import { flagTokenToId } from "../utils/flagIndex";
import { flagById } from "../utils/flagIndex";


import { ENABLED_SHELLS } from "../config/shells";

function HomePage(){
const [inputWindows, setInputWindows] = useState([{id: nanoid(), language: "bash"}, {id: nanoid(), language: "powershell"}]);
const [dialogOpen, setDialog] = useState(false);
const [activeWindowId, setActiveWindowId] = useState();
// State for initial page load. Allows display of placeholder text in all windows.
const [activeWindowsBoolean, setActiveWindowsBoolean] = useState(false);
// State for inputText
const [text, setText] = useState(["Type a command here and see the equivalent in another window!"]);
const [commandIds, setCommandId] = useState([]);
// maintains uniform window size for all InputWindows
const [textAreaSize, setTextAreaSize] = useState([700, 700]);
const [lockWindows, setLockWindows] = useState(true);

function setActiveWindowIdHandler(windowId, displayedText, languageName) {
    if (!activeWindowsBoolean) {
        // first activation: clear placeholder text
        setText("");
        setActiveWindowsBoolean(true);
    } else {
        // keep this window's current content and re-translate the others from it
        setTextHandler(displayedText, languageName, windowId);
    }
    setActiveWindowId(windowId);
}
// idk if this is right, if i can just set true? Could just change to one function that does !current state. 
function openDialog() {
    setDialog(true);
}

function closeDialog() {
    setDialog(false);
}

function addInputWindow(languageName) {

    //setInputWindowLanguage(languageName);
    const id = nanoid();
    closeDialog();
    setInputWindows(prev => [...prev, {id: id, language: languageName}]);

}
/*
function removeInputWindow() {
    setInputWindows()
}*/

function removeInputWindow(id) {
    setInputWindows(prev => prev.filter(w => w.id !== id));
}

/*
function getInput() {
    useEffect(() => {

        // think the dependency array should be the text input? yeah? because we would run useEffect when it is changed? 
    }, [])
}
*/


function setCommandIdHandler(commandIdArray) {
    setCommandId(commandIdArray);
}


function setTextHandler(inputText, languageName, nId) {
    setText(inputText); //moved up. text probably should be the same as userInput. Can parse after for other windows. 
    //const checkedText = tokenizeText(inputText)
    let inputTextArray = inputText.split(' ');
    console.log(inputTextArray);
    matchText(inputTextArray, languageName);
}

function setLockWindowsHandler() {
    return setLockWindows(!lockWindows);
}

// Normalize a token for lookup according to the input shell's case rules.
// Mirrors how the indexes were built (lowercase keys for case-insensitive shells).
function normalizeToken(token, languageName) {
    if (typeof token !== "string") return token;
    return languages[languageName]?.caseSensitive ? token : token.toLowerCase();
}

// Resolve a flag within the current command's context, using the input shell's token.
// Flags are taken from the command itself, so shared ids like "recursive"
// return the correct command's flag (ls -R vs cp -r).
function findFlagInCommand(commandObject, token, languageName) {
    if (!commandObject || typeof token !== "string") return undefined;
    const normalized = normalizeToken(token, languageName);
    return commandObject.flags.find(flag => {
        const flagToken = flag.shells[languageName];
        return flagToken !== undefined &&
               normalizeToken(flagToken, languageName) === normalized;
    });
}

function matchText(textArray, languageName) {
    let resultArr = [];
    let currentCommandArr = [];
    // keep track of currentCommandObject for checking valid flags and options (context)
    let currentCommandObject = null;
    let commandIdCheck = null;
    let nextCommand = null;

    for (let i = 0; i < textArray.length + 1; i++) {
    const element = textArray[i]
    console.log("ELEMENT", element);

    // CHANGED: normalize before lookup so "Get-ChildItem" matches "get-childitem"
    commandIdCheck = commandTokenToId[normalizeToken(element, languageName)];
    console.log("commandIdCheck: ", commandIdCheck);

    if (!commandIdCheck && !currentCommandObject) {
        continue;
    }

    // CHANGED: resolve the flag from the current command's own flag list
    const matchedFlag = findFlagInCommand(currentCommandObject, element, languageName);

    if (commandIdCheck) {
        currentCommandObject = commandById[commandIdCheck];
        console.log("currentCommandObject: ", currentCommandObject);
        currentCommandArr.push(currentCommandObject)
        continue;
    }
    // CHANGED: push the command's own flag object instead of the global flagById entry
    else if (matchedFlag) {
        currentCommandArr.push(matchedFlag);
    }
    else {
        resultArr.push(currentCommandArr);
        currentCommandArr = [];
        currentCommandObject = null;
        i--;
    }
}
    
    console.log("currentCommandArr: ", currentCommandArr)
        console.log("result", resultArr);
    setCommandIdHandler(resultArr);
};

function handleClickOutsideDialog(e) {

}

    return (
        <>
        <div className="outside-input-container-right" >
        </div>
        <div className="input-windows-container">
            <div>
                <button className="lock-button" onClick={setLockWindowsHandler}>{lockWindows ? '\u{1F512}' : '\u{1F513}'} Window</button>
            </div>
            <div className="add-dialog-container" onClick={handleClickOutsideDialog}>
    {dialogOpen ? (
        <div role="dialog" className="dialogue">
            {Object.entries(languages)
                .filter(([languageName]) => ENABLED_SHELLS.some(shell => shell.id === languageName))
                .map(([languageName]) => (
                    <button key={languageName} onClick={() => addInputWindow(languageName)}>
                        {languageName}
                    </button>
                ))}
            <button className="close-button" onClick={closeDialog}>x</button>
        </div>
    ) : null}
    <button className="add-button" onClick={openDialog}>Add</button>
</div>
        {/*changed languageName attribute to .language from .languageName*/}
            {inputWindows.map(window => (
                <InputWindow 
                    key={window.id}
                    languageName={window.language} 
                    onRemove={() => removeInputWindow(window.id)}
                    setTextHandler ={setTextHandler}
                    nId={window.id}
                   /* translatedCommands={() =>
                        commandIds.forEach((commandId) =>{
                            commands[commandId].shells[languageName].command
                        }
                        
                        )
                    } */
                    commandIds={commandIds}
                    setActiveWindowIdHandler={setActiveWindowIdHandler}
                    activeWindowId={activeWindowId}
                    text={text}
                    textAreaSize={textAreaSize}
                    setTextAreaSize={setTextAreaSize}
                    lockWindows={lockWindows}
                    setLockWindows={setLockWindowsHandler}
                    activeWindowsBoolean={activeWindowsBoolean}
                    />
            ))}
        </div>
        </>
    );
}

export default HomePage;