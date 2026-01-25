import { useState } from "react";

import InputWindow from "../components/InputWindow";

function HomePage(){
const [inputWindows, setInputWindows] = useState([]);

function addInputWindow() {
    setInputWindows(prev => [...prev, prev.length]);
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
        <button onClick={addInputWindow}>Add</button>
            {inputWindows.map(id => (
                <InputWindow 
                    key={id}
                    onRemove={() => removeInputWindow(id)}
                    />
            ))}
        </>
    );
}

export default HomePage;