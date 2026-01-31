import { useState, useId } from 'react'



function InputWindow({ onRemove, languageName }){
// idk if i need this here or in homepage. 

const [text, setText] = useState();

const inputTextAreaId = useId();



function setTextHandler(inputText) {
    setText(inputText);
}

function checkMatch() {
    
}
    return (
        <>
        <div className='input-window'>
            <button className='close-button' onClick={onRemove}>x</button>
            <div>{languageName}</div>
            <label htmlFor={inputTextAreaId}></label>
            <textarea
                id={inputTextAreaId}
                name='inputTextArea'
                onChange={(e) => setText(e.target.value)}
            />
            
        </div>
        </>
    );
}

export default InputWindow;