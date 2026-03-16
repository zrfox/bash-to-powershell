import commands from "../data/commands.json" with { type: "json" };
import languages from "../data/languages.json" with { type: "json" };
const flagTokenToId = {};
const flagById = {};

commands.forEach(cmd => {
    cmd.flags.forEach(flag => {
        flagById[flag.id] = flag;

        // shellName would be the property and shellData would be the json property's value...does that work? 
        Object.entries(flag.shells).forEach(([shellName, shellData]) => {
                       //console.log( "shellname", shellName, "shelldata: ", shellData);

            // check if language has case-sensitive flags
            if (languages[shellName].caseSensitive) {
                flagTokenToId[shellData] = flag.id;
            }
            else {
                flagTokenToId[shellData.toLowerCase()] = flag.id;
            }
            
        })
    })
    console.log(flagTokenToId);
})

// flags have different meanings depending on the command, especially in bash. 
// this means. when parsing user input, we will look up the flagId after getting the
// commandId. 

export { flagTokenToId, flagById };