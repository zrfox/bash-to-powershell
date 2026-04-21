import { useEffect, useState, useId } from "react";
import { nanoid } from "nanoid"

import InputWindow from "../components/InputWindow";
import commands from "../data/commands.json";
import languages from "../data/languages.json";

import { commandTokenToId } from "../utils/commandIndex";
import { commandById } from "../utils/commandIndex";
import { flagTokenToId } from "../utils/flagIndex";
import { flagById } from "../utils/flagIndex";

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

function setActiveWindowIdHandler(windowId) {
    // clear placeholder text once activeWindowId is set.
    if (activeWindowsBoolean === false) {
        setText("");
        setActiveWindowsBoolean(true);
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


function matchText(textArray, languageName) {
    let resultArr = [];
    let currentCommandArr = [];
    // keep track of currentCommandObject for checking valid flags and options (context)
    let currentCommandObject = null;
    let commandIdCheck = null;
    let nextCommand = null;

    // length + 1 to make sure else case to push to resultArr occurs at end of last command
    for (let i = 0; i < textArray.length + 1; i++) {
        // might go out of bounds with length + 1
        const element = textArray[i]
        console.log("ELEMENT", element);

        // get command first, then work within command's context
        commandIdCheck = commandTokenToId[element];
        console.log("commandIdCheck: ", commandIdCheck);

        // if not a command and there isn't a currentCommandObject for context...
        // then this is invalid and continue
        if (!commandIdCheck && !currentCommandObject) {
            continue;
            // or return invalid input? 
            // shouldnt do this^ because while typing most input is invalid
        }

        // null/undefined results to false, right? maybe check explicitly for undefined. Undefined falsy in js
        if (commandIdCheck) {
            currentCommandObject = commandById[commandIdCheck];
            console.log("currentCommandObject: ", currentCommandObject);
            currentCommandArr.push(currentCommandObject)
            continue;
        }
        

        // check flags of currentCommandObject
        else if (currentCommandObject && currentCommandObject.flags.some(flag => flag.id === flagTokenToId[element])) {
            currentCommandArr.push(flagById[flagTokenToId[element]])
        }
        // check options of currentCommandObject
        //else if () {

        //}

        // either unrecognized token or end of current command. if following token is not a new command or pipe/operator then it's probably invalid.  
        // this won't ever be reached because the first condition would be true for this case
        // what I do want, is to see that the element is not in the command's context
        // and then we loop on that again if we realize this. 
        // and before the loop we push to resultArr
        // we really have to fix the problem of the commandIdCheck setting and ruining the context of the current command
        else //if (commandTokenToId[element]) 
        {
            resultArr.push(currentCommandArr);
            currentCommandArr = [];
            currentCommandObject = null;
            i--;

        }    
        
        //else {
            // can get unknown value and replace with unknown or keep for checking suggestions later on
        //}

        /*
        
        

        // likely need to split commands and id's before this, or at least check as we go
        // could check if hyphen at start...that will probaly fail later but for now..will expose issue later so sure
        if (element[0] == '-') {
            if (currentCommand) {
                const flagId = flagTokenToId[`${languageName}: ${element}`];
                if (flagId) currentCommand.flagIds.push(flagId);
                //result.push(currentCommand);
            }
           // commandIdArray.push(flagTokenToId[element]);
        }
        else {
            const commandId = commandTokenToId[element];
            if (commandId) {
                currentCommand = { commandId, flagIds: [] };
                result.push(currentCommand);
            }
        }
            */
        


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
            <div className="add-dialog-container" onClick={() => handleClickOutsideDialog(e)}>

                {dialogOpen ? (
                    <div role="dialogue" className="dialogue">
                        {Object.entries(languages).map(([languageName, data]) => {
                            return (
                                <button key={languageName} onClick={() => addInputWindow(languageName)}>
                                {languageName}
                                </button>)
                        }                    
                        )}
                                    <button className='close-button' onClick={closeDialog}>x</button>

                        
                        
                    </div>
                ) : (<></>)
            }
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