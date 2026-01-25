import { useState } from 'react'



function InputWindow({ onRemove }){
// idk if i need this here or in homepage. 

    return (
        <>
        <div className='input-window'>
            <button className='close-button' onClick={onRemove}>x</button>
            <textarea />
        </div>
        </>
    );
}

export default InputWindow;