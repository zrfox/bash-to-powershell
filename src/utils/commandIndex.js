import commands from "../data/commands.json"

const commandTokenToId = {};
const commandById = {};

commands.forEach(cmd => {
    commandById[cmd.id] = cmd;

    // destructures into a key-value array with [0] as the shellName/key and the value as shelldata 
    Object.entries(cmd.shells).forEach(([shellName, shellData]) => {

        // main command
        commandTokenToId[shellData.command.toLowerCase()] = cmd.id;

        shellData.aliases.forEach(alias => {
            commandTokenToId[alias.toLowerCase()] = cmd.id;
        })
    })
})

export { commandTokenToId, commandById };