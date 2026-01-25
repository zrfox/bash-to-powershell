import { useState } from 'react'



function InputWindow({ onRemove, languageName }){
// idk if i need this here or in homepage. 

    return (
        <>
        <div className='input-window'>
            <button className='close-button' onClick={onRemove}>x</button>
            <div>{languageName}</div>
            <textarea />
        </div>
        </>
    );
}

export default InputWindow;