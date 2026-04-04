import { useEffect, useState, useId } from "react";
import { nanoid } from "nanoid"

import InputWindow from "../components/InputWindow";
import commands from "../data/commands.json";
import languages from "../data/languages.json";

import { commandTokenToId } from "../utils/commandIndex";
import { commandById } from "../utils/commandIndex";

function HomePage(){
const [inputWindows, setInputWindows] = useState([{id: nanoid(), language: "bash"}, {id: nanoid(), language: "powershell"}]);
const [dialogOpen, setDialog] = useState(false);
const [activeWindowId, setActiveWindowId] = useState();

function setActiveWindowIdHandler(windowId) {
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

// State for inputText
const [text, setText] = useState([]);
const [commandIds, setCommandId] = useState([]);

function setCommandIdHandler(commandIdArray) {
    setCommandId(commandIdArray)
}


function setTextHandler(inputText, languageName, nId) {
    const checkedText = tokenizeText(inputText)
    matchText(checkedText, languageName);
    setText(checkedText);
}
/*
function processText(inputText) {
   const cleanedText = tokenizeText(inputText);
    return cleanedText;
    
}*/

function tokenizeText(input) {
    return input.toLowerCase().split(' ');
}

function matchText(textArray, languageName) {
    let commandIdArray = [];
    textArray.forEach(element => {
        commands.forEach(command => {
            if (command.shells[languageName].command === element) {
                commandIdArray.push(command.id);
        }
    }
       )});
    setCommandIdHandler(commandIdArray);
}

    return (
        <>
        <div className="input-windows-container">
        <div className="add-dialog-container">
            {dialogOpen ? (
                <div role="dialogue" className="dialogue">
                    {Object.entries(languages).map(([languageName, data]) => {
                        return (
                            <button key={languageName} onClick={() => addInputWindow(languageName)}>
                            {languageName}
                            </button>)
                    }                    
                    )}
                    
                    
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
                    />
            ))}
        </div>
        </>
    );
}

export default HomePage;