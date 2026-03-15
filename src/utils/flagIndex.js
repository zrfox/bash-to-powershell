import commands from "../data/commands.json" with { type: "json" };

const flagTokenToId = {};
const flagById = {};

commands.forEach(cmd => {
    cmd.flags.forEach(flag => {
        flagById[flag.id] = flag;

        // shellName would be the property and shellData would be the json property's value...does that work? 
        Object.entries(flag.shells).forEach(([shellName, shellData]) => {
            flagTokenToId[shellData.shellData] = flag.id;
           // console.log( "shellname", shellName, "shelldata: ", shellData);
        })
    })
    
})


//wait, when you do forEach on an array like flags does that make each element of the array it iterates or is it making each array an element? 
// *** Bash flags are case-sensitive. -a and -A are different.
// this causes a problem since powershell isn't case-sensitive it seems...so, currently if they don't capitalize the firest letter of the flag
// if going from powershell to Bash then it won't be found...
// I could make it not agnostic, so if shellName is powershell can use toLowercase and change all powershell flags in...
// or maybe handle Bash seperately? 
// I can't just toLower the token because of this. 
// I can't just ignore casing because...that means the casing of the json is going to be what determines a match. 

// the toLower in the command lookupmaps are likely going to toLower the tokens taken in to normalize...though 
// Bash commands are also case-sensitive. LS will fail, for instance. But all system calls are lowercase...so translating
// to lowercase from input is really not an issue. 
// the isue is with flags though. 
// can't just make powershell json flag values lowercase because then uppercase same flags will miss...actually,
// it doesn't if I toLower the input flags, but I can't blindly toLower the input flags either because they might be bash flags.
// looking like the only solution is to check if the shell has case-sensitivity and branching in those cases. 
// OR
// you add all caps variants, which is stupid and ugly and redundant and doesn't even account for commands where only some letters are cap'd. 
// we're not going to normalize flag caps. Maybe just later have suggestions for if they meant a different flag if the caps aren't right. 