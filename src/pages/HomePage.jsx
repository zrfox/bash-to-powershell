import { useState } from "react";

import InputWindow from "../components/InputWindow";

function HomePage(){
const [inputWindows, setInputWindows] = useState([]);

function addInputWindow() {
    setInputWindows(prev => [...prev, <InputWindow />]);
}
  
    return (
        <>
        <button onClick={addInputWindow}></button>
            {inputWindows}
        </>
    );
}

export default HomePage;