const fetch = require('node-fetch');

module.exports = async function fetchTsvToDict(id) {

    let fullURL = `https://docs.google.com/spreadsheets/d/${id}/export?format=tsv`;
    let response = await fetch(fullURL);
    let dict = {};

    let lines = (await response.text()).split("\n")

    lines.shift()

    for (i = 0; i<lines.length; i++) {
        let line = lines[i].split("\t");
        dict[line[2].replace("\r", "")] = line[1].replace("\r","");
    }

    return dict

}