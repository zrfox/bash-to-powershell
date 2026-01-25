import { useState } from "react";
import { nanoid } from "nanoid"

import InputWindow from "../components/InputWindow";
import commands from "../data/commands.json";
import languages from "../data/languages.json";

function HomePage(){
const [inputWindows, setInputWindows] = useState([]);
const [dialogOpen, setDialog] = useState(false);

// idk if this is right, if i can just set true? 
function openDialog() {
    setDialog(true);
}

function addInputWindow() {


    setInputWindows(prev => [...prev, nanoid()]);
}
/*
function removeInputWindow() {
    setInputWindows()
}*/

function removeInputWindow(id) {
    setInputWindows(prev => prev.filter(w => w !== id));
}
  
    return (
        <>
        <div className="input-windows-container">
        <div>
            <button className="add-button" onClick={openDialog}>Add</button>
        </div>
        <div className="dialog-container">
            {dialogOpen ? (
                <dialog open>
                    {languages.languages.map(language => (
                        <button key = {language.id}>
                            {language.name}
                        </button>
                    ))}
                </dialog>
            ) : (<></>)
        }
        </div>
            {inputWindows.map(id => (
                <InputWindow 
                    key={id}
                    onRemove={() => removeInputWindow(id)}
                    />
            ))}
        </div>
        </>
    );
}

export default HomePage;