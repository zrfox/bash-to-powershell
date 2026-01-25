import { useState } from 'react'



function InputWindow({ onRemove }){
// idk if i need this here or in homepage. 

    return (
        <>
        <button onClick={onRemove}>Remove</button>
        <textarea />
        </>
    );
}

export default InputWindow;