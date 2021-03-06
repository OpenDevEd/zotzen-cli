#!/usr/bin/env node

const { ArgumentParser } = require('argparse');

// PRODUCTION: Load library
const zotzenlib = require("zotzen-lib");
// TESTING: Load locally for testing
// const zotzenlib = require("../zotzen-lib/index");

const { 
  zotzenInit,
 } = require("./zotzen-helper");


function getArguments() {
  const parser = new ArgumentParser({ "description": "Zotzen command line utility. Move data and files from Zotero to Zenodo." });

  parser.add_argument(
    "--zoteroconfig", {
    "action": "store",
    "default": "zotero-cli.toml",
    "help": "Config file with API key. By default config.json then ~/.config/zotero-cli/zotero-cli.toml are used if no config is provided."
  });
  parser.add_argument(
    "--zenodoconfig", {
    "action": "store",
    "default": "config.json",
    "help": "Config file with API key. By default config.json then ~/.config/zenodo-cli/config.json are used if no config is provided."
  });
  parser.add_argument(
    "--verbose", {
    "action": "store_true",
    "default": false,
    "help": "Run in verbose mode"
  });
  parser.add_argument(
    '--debug', {
    action: 'store_true',
    "default": false,
    help: 'Enable debug logging',
  });

  parser.add_argument(
    '--show', {
    action: 'store_true',
    help: 'Show the Zotero and Zenodo item information',
  });
  parser.add_argument(
    '--open', {
    action: 'store_true',
    help:
      'Open the Zotero and Zenodo link after creation (both on web).',
  });
  parser.add_argument(
    '--oapp', {
    action: 'store_true',
    help:
      'Open the Zotero link (app) and the Zenodo link after creation (web).',
  });
  parser.add_argument(
    "--dump", {
    "action": "store_true",
    "help": "Show json for list and for depositions after executing the command.",
    "default": false
  });

  const subparsers = parser.add_subparsers({ "help": "sub-command help" });

  const parser_init = subparsers.add_parser(
    "init", {
    "help": "Set up config files for Zotero/Zenodo in the default location."
  });
  parser_init.set_defaults({ "func": zotzenInit });

  const parser_create = subparsers.add_parser(
    "create", {
    "help": "Create a new pair of Zotero/Zenodo entries. Note: If you already have a Zotero item, use 'link' instead. If you have a Zenodo item already, but not Zotero item, make a zotero item in the Zotero application and also use 'link'."
  });
  parser_create.set_defaults({ "func": zotzenlib.create });
  parser_create.add_argument('--group', {
    "nargs": 1,
    help: 'Group ID for which the new item Zotero is to be created. (Can be provided via Zotero config file.)',
  });
  // This set of options should match zenodo-cli create
  parser_create.add_argument("--json", {
    "action": "store",
    "help": "Path of the JSON file with the metadata for the zenodo record to be created. If this file is not provided, a template is used. The following options override settings from the JSON file / template."
  });
  parser_create.add_argument("--title", {
    "action": "store",
    "help": "The title of the record. Overrides data provided via --json."
  });
  parser_create.add_argument("--date", {
    "action": "store",
    "help": "The date of the record. Overrides data provided via --json."
  });
  parser_create.add_argument("--description", {
    "action": "store",
    "help": "The description (abstract) of the record. Overrides data provided via --json."
  });
  parser_create.add_argument("--communities", {
    "action": "store",
    "help": "Read list of communities for the record from a file. Overrides data provided via --json."
  });
  parser_create.add_argument("--add-communities", {
    "nargs": "*",
    "action": "store",
    "help": "List of communities to be added to the record (provided on the command line, one by one). Overrides data provided via --json."
  });
  // Not needed as we're creating new records
  /* parser_create.add_argument("--remove-communities", {
    "nargs": "*",
    "action": "store",
    "help": "List of communities to be removed from the record (provided on the command line, one by one). Overrides data provided via --json."
  }); */
  parser_create.add_argument("--authors", {
    "nargs": "*",
    "action": "store",
    "help": "List of authors, (provided on the command line, one by one). Separate institution and ORCID with semicolon, e.g. 'Lama Yunis;University of XYZ;0000-1234-...'. (You can also use --authordata.) Overrides data provided via --json."
  });
  parser_create.add_argument("--authordata", {
    "action": "store",
    "help": "A text file with a database of authors. Each line has author, institution, ORCID (tab-separated). The data is used to supplement insitution/ORCID to author names specified with --authors. Note that authors are only added to the record when specified with --authors, not because they appear in the specified authordate file. "
  });
  // Not needed, as we're creating this. 
  /* parser_create.add_argument("--zotero-link", {
    "action": "store",
    "help": "Zotero link of the zotero record to be linked. Overrides data provided via --json."
  }); */


  const parser_link = subparsers.add_parser(
    "link", {
    "help": "Link Zotero item with a Zenodo item, or generate a missing item."
  });
  parser_link.set_defaults({ "func": zotzenlib.link });
  parser_link.add_argument(
    "id", {
    "nargs": 2,
    "help": "Link Zotero item with a Zenodo item, or generate a missing item. Provide one/no Zotero item and provide one/no Zenodo item. Items should be of the format zotero://... and a Zenodo DOI or https://zenodo.org/... url."
  });

  const parser_push = subparsers.add_parser(
    "push", {
    "help": "Move/synchronise Zotero data to Zenodo."
  });
  parser_push.set_defaults({ "func": zotzenlib.push });
  parser_push.add_argument(
    "id", {
    "nargs": "*",
    "help": "Move/synchronise Zotero data to Zenodo. Provide one or more Zotero ids."
  });
  parser_push.add_argument(
    '--sync', {
    action: 'store_true',
    help: 'Sync metadata from zotero to zenodo.'
  });
  parser_push.add_argument(
    '--push', {
    action: 'store_true',
    help: 'Push Zotero attachments to Zenodo.'
  });
  parser_push.add_argument(
    '--type', {
    action: 'store',
    help: 'Type of the attachments to be pushed.',
    default: 'all'
  });
  parser_push.add_argument('--publish', {
    action: 'store_true',
    help: 'Publish zenodo record.'
  });
  return parser.parse_args();
}

// -------------------------- main ---------------------------------------

async function run() {

  const args = getArguments();

    console.log('TRY');
    if (args.func) {
      console.log("Action: "+args.func.name)
      await args.func(args).then(res=>{
      
        console.log("Result: "+JSON.stringify(res, null, 2))
          console.log("Done.")
      
    }).catch(e=>{
      console.log(e);
    })
     
      
    };
} 
console.log("Start")
run();
console.log("End.")
//process.exit(0)





