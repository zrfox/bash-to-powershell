import { useState, useId } from 'react'



function InputWindow({ onRemove, languageName }){
// idk if i need this here or in homepage. 

const inputTextAreaId = useId();

    return (
        <>
        <div className='input-window'>
            <button className='close-button' onClick={onRemove}>x</button>
            <div>{languageName}</div>
            <label htmlFor={inputTextAreaId}></label>
            <textarea
                id={inputTextAreaId}
                name='inputTextArea'
            />
            
        </div>
        </>
    );
}

export default InputWindow;