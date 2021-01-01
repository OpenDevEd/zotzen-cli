#!/usr/bin/env node

// const ArgumentParser = require('argparse').ArgumentParser;
// import * as argparse from 'argparse';
const { ArgumentParser } = require('argparse');
const { version } = require('./package.json');
const childProcess = require('child_process');
const fs = require('fs');
const opn = require('opn');
const path = require('path');
const prompt = require('prompt');
const getPrompt = require('util').promisify(prompt.get).bind(prompt);
// TODO
// require('zotero-api-lib')
// require('zenodo-api-lib')
/*
const parser = new ArgumentParser({
  version: '1.0.0',
  addHelp: true,
  description: 'ZotZen utility. Main modes are --new or provide a Zotero item.',
});
*/

console.log("checking...")
// const parser = new argparse.ArgumentParser({ "description": "Zenodo command line utility" });

/*
New parser
*/
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
    "action": "store_false",
    "help": "Run in verbose mode"
  });
  parser.add_argument(
    '--debug', {
    action: 'store_true',
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
  parser_create.set_defaults({ "func": zotzenCreate });
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
  parser_link.set_defaults({ "func": zotzenLink });
  parser_link.add_argument(
    "id", {
    "nargs": 2,
    "help": "Link Zotero item with a Zenodo item, or generate a missing item. Provide one/no Zotero item and provide one/no Zenodo item. Items should be of the format zotero://... and a Zenodo DOI or https://zenodo.org/... url."
  });

  const parser_push = subparsers.add_parser(
    "push", {
    "help": "Move/synchronise Zotero data to Zenodo."
  });
  parser_push.set_defaults({ "func": zotzenPush });
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

const args = getArguments();

// TODO: These constants need to be replaced with calls to the API
const zoteroPrefix = 'node bin/zotero-cli.js';
const zenodoPrefix = 'python zenodo-cli.py';
const zoteroSelectPrefix = 'zotero://select';
const zoteroApiPrefix = 'https://api.zotero.org';
const zoteroTmpFile = 'zotero-cli/tmp';
const zenodoTmpFile = 'zenodo-cli/tmp';
const zenodoCreateRecordTemplatePath = 'zenodo-cli/template.json';

// -------------------------- main ---------------------------------------


// --- main ---
try {
  if (args.func) {
    args.func(args)
  } else {
    console.log("Error in command line arguments: specify one verb.")
  }
} catch (ex) {
  if (args.debug) {
    console.log('DEBUG: ERROR');
  }
  if (args.debug) {
    console.log(ex);
  }
}
process.exit(0)


async function zotzenInit(args) {
  if (args.debug) {
    console.log('DEBUG: zotzenInit');
  }
  console.log(JSON.stringify(args, null, 2))
  process.exit(1)
  const schema = {
    properties: {
      'Zenodo API Key': {
        message: 'Please enter you Zenodo API Key. (Enter to ignore)',
      },
      'Zotero API Key': {
        message: 'Please enter your Zotero API Key. (Enter to ignore)',
      },
      'Zotero User ID': {
        message: 'Please enter your Zotero User ID. (Enter to ignore)',
      },
      'Zotero Group ID': {
        message: 'Please enter your Zotero Group ID. (Enter to ignore)',
      },
    },
  };
  prompt.start();
  prompt.get(schema, (err, result) => {
    if (err) {
      console.err('Invalid input received');
    } else {
      const zenKey = result['Zenodo API Key'];
      if (zenKey) {
        fs.writeFileSync(
          'zenodo-cli/config.json',
          JSON.stringify({
            accessToken: zenKey,
          })
        );
        console.log(
          'Zenodo config wrote successfully to zenodo-cli/config.json.'
        );
      }

      const zotKey = result['Zotero API Key'];
      const zotUid = result['Zotero User ID'];
      const zotGid = result['Zotero Group ID'];
      if (zotKey || zotUid || zotGid) {
        fs.writeFileSync(
          'zotero-cli/zotero-cli.toml',
          `${zotKey ? 'api-key="' + zotKey + '"\n' : ''}` +
          `${zotUid ? 'user-id="' + zotUid + '"\n' : ''}` +
          `${zotGid ? 'group-id="' + zotGid + '"\n' : ''}`
        );
        console.log(
          'Zotero config wrote successfully to zotero-cli/zotero-cli.toml'
        );
      }
    }
  });
}

function zotzenCreate(args) {
  if (args.debug) {
    console.log('DEBUG: zotzenCreate');
  }
  console.log(JSON.stringify(args, null, 2))
  process.exit(1)

  if (args.debug) {
    console.log('DEBUG: zotzenCreate');
  }
  // let zoteroArgs = args
  // // remove some args/add some args
  // zoteroArgs["func"] = "create"
  // const zoteroRecord = zoteroAPI(zoteroArgs);
  const zoteroRecord = zoteroCreate(args.title, args.group, args.json);
  const zoteroSelectLink = zoteroRecord.successful[0].links.self.href.replace(
    zoteroApiPrefix,
    zoteroSelectPrefix
  );
  // let zenodoArgs = args
  // zenodoArgs["func"] = "create"
  // // Utilise the zotero id as alternative id for the Zenodo record
  // zenodoArgs["zoteroSelectLink"] = zoteroSelectLink
  // const zenodoRecord = zenodoAPI(zenodoArgs)
  const zenodoRecord = zenodoCreate(
    zoteroRecord.successful[0].data.title,
    zoteroRecord.successful[0].data.creators,
    zoteroSelectLink
  );
  /*
  const doi = zenodoRecord["doi"]
  */
  const doi = parseFromZenodoResponse(zenodoRecord, 'DOI');
  const zenodoDepositUrl = parseFromZenodoResponse(zenodoRecord, 'URL');

  // // We now need to add teh doi to the zotero record
  // zoteroArgs["func"] = "update"
  // zoteroArgs["extra"] = "DOI: "+doi
  // const updatedZoteroRecord = zoteroAPI(zoteroArgs);

  linkZotZen(zoteroRecord.successful[0].key, doi, args.group);

  console.log('Item successfully created: ');
  console.log(
    `Zotero ID: ${zoteroRecord.successful[0].library.id}:${zoteroRecord.successful[0].key}`
  );
  console.log(`Zotero link: ${zoteroRecord.successful[0].links.self.href}`);
  console.log(`Zotero select link: ${zoteroSelectLink}`);
  console.log(
    `Zenodo RecordId: ${parseFromZenodoResponse(zenodoRecord, 'RecordId')}`
  );
  console.log(`Zenodo DOI: ${doi}`);
  console.log(`Zenodo deposit link: ${zenodoDepositUrl}`);

  // This should not be needed, as --show/--open etc has been passed through via the APIs.
  if (args.open) {
    opn(zoteroSelectLink);
    opn(zenodoDepositUrl);
  }
}

async function zotzenLink(args) {
  if (args.debug) {
    console.log('DEBUG: zotzenLink');
  }
  console.log(JSON.stringify(args, null, 2))
  process.exit(1)

}

async function zotzenPush(args) {
  if (args.debug) {
    console.log('DEBUG: zotzenPush');
  }
  console.log(JSON.stringify(args, null, 2))
  process.exit(1)
  if (!syncErrors(doi, zenodoRawItem, zoteroSelectLink)) {
    const children = JSON.parse(
      runCommand(
        `${groupId ? '--group-id ' + groupId : ''
        } get /items/${itemKey}/children`,
        true
      )
    );
    let attachments = children.filter(
      (c) =>
        c.data.itemType === 'attachment' &&
        c.data.linkMode === 'imported_file'
    );
    const attachmentType = args.type.toLowerCase();
    if (attachmentType !== 'all') {
      attachments = attachments.filter((a) =>
        a.data.filename.endsWith(attachmentType)
      );
    }
    if (!attachments.length) {
      console.log('No attachments found.');
    } else {
      attachments.forEach((attachment) => {
        doi = pushAttachment(
          itemKey,
          attachment.data.key,
          attachment.data.filename,
          doi,
          groupId,
          userId
        );
      });
    }
  }
}



/*
// TODO
Replace runCommand with two functions:
- zenodoAPI
- zoteroAPI

*/

function runCommandWithJsonFileInput(command, json, zotero = true) {
  if (args.debug) {
    console.log('DEBUG: runCommandWithJsonFileInput');
  }
  fs.writeFileSync(
    zotero ? zoteroTmpFile : zenodoTmpFile,
    JSON.stringify(json)
  );
  const response = runCommand(`${command} tmp`, zotero);
  fs.unlinkSync(zotero ? zoteroTmpFile : zenodoTmpFile);
  return response;
}

function runCommand(command, zotero = true) {
  if (args.debug) {
    console.log('DEBUG: runCommand; ' + command);
  }
  try {
    return childProcess
      .execSync(`${zotero ? zoteroPrefix : zenodoPrefix} ${command}`, {
        cwd: `${zotero ? 'zotero' : 'zenodo'}-cli`,
        stdio: [],
      })
      .toString();
  } catch (ex) {
    try {
      return JSON.parse(ex.stderr.toString());
    } catch (_) { }
    throw new Error(`${zotero ? 'Zotero' : 'Zenodo'}: ${ex.output.toString()}`);
  }
}

// This function should be removed.
function parseFromZenodoResponse(content, key) {
  if (args.debug) {
    console.log('DEBUG: parseFromZenodoResponse');
  }
  return content
    .substr(content.indexOf(`${key}:`))
    .split('\n')[0]
    .split(':')
    .slice(1)
    .join(':')
    .trim();
}

function zoteroCreate(args) {
  // This could call the zoteroAPI with a subset of args
  // title, group, jsonFile = null) {
  console.log(JSON.stringify(args))
  process.exit(1)
  if (args.debug) {
    console.log('DEBUG: zoteroCreate');
  }
  if (jsonFile) {
    return JSON.parse(
      runCommand(
        `${group ? '--group-id ' + group : ''} create-item ${path.join(
          __dirname,
          jsonFile
        )}`,
        true
      )
    );
  }

  const zoteroCreateItemTemplate = runCommand(
    'create-item --template report',
    true
  );
  const templateJson = JSON.parse(zoteroCreateItemTemplate);
  templateJson.title = title;
  return JSON.parse(
    runCommandWithJsonFileInput(
      `${group ? '--group-id ' + group : ''} create-item`,
      templateJson,
      true
    )
  );
}

function zenodoCreate(title, creators, zoteroSelectLink, template) {
  // This could call the zenodoAPI with a subset of args
  if (args.debug) {
    console.log('DEBUG: zenodoCreate');
  }
  template = template || zenodoCreateRecordTemplatePath;
  const zenodoTemplate = JSON.parse(fs.readFileSync(template).toString());
  zenodoTemplate.related_identifiers[0].identifier = zoteroSelectLink;
  if (!zenodoTemplate.title) zenodoTemplate.title = title;
  if (!zenodoTemplate.description) zenodoTemplate.description = title;
  if (creators) zenodoTemplate.creators = creators;
  return runCommandWithJsonFileInput('create --show', zenodoTemplate, false);
}

function linkZotZen(zoteroKey, zenodoDoi, group, zoteroLink = null) {
  if (args.debug) {
    console.log('DEBUG: linkZotZen');
  }
  runCommandWithJsonFileInput(
    `${group ? '--group-id ' + group : ''} update-item --key ${zoteroKey}`,
    {
      extra: `DOI: ${zenodoDoi}`,
    }
  );

  if (zoteroLink) {
    runCommand(`update ${zenodoDoi} --zotero-link ${zoteroLink}`, false);
  }
}


function zoteroGet(groupId, userId, itemKey) {
  if (args.debug) {
    console.log('DEBUG: zoteroGet');
  }
  return JSON.parse(
    runCommand(
      `${groupId ? '--group-id ' + groupId : ''} ${userId ? '--user-id ' + userId : ''
      } item --key ${itemKey}`,
      true
    )
  );
}

function zenodoGet(doi) {
  if (args.debug) {
    console.log('DEBUG: zenodoGet');
  }
  const zenodoResponse = runCommand(`get ${doi} --show`, false);
  return {
    title: parseFromZenodoResponse(zenodoResponse, 'Title'),
    status: parseFromZenodoResponse(zenodoResponse, 'State'),
    writable:
      parseFromZenodoResponse(zenodoResponse, 'Published') == 'yes'
        ? 'not'
        : '',
    url: parseFromZenodoResponse(zenodoResponse, 'URL'),
    doi: parseFromZenodoResponse(zenodoResponse, 'DOI'),
  };
}

function zenodoGetRaw(doi) {
  if (args.debug) {
    console.log('DEBUG: zenodoGetRaw');
  }
  runCommand(`get ${doi}`, false);
  const fileName = doi.split('.').pop();
  return JSON.parse(fs.readFileSync(`zenodo-cli/${fileName}.json`).toString());
}

function getZoteroSelectlink(id, key, group = false) {
  if (args.debug) {
    console.log('DEBUG: getZoteroSelectlink');
  }
  return `zotero://select/${group ? 'groups' : 'users'}/${id}/items/${key}`;
}

function syncErrors(doi, zenodoRawItem, zoteroSelectLink) {
  if (args.debug) {
    console.log('DEBUG: syncErrors');
  }
  let error = false;
  if (!doi) {
    console.log(
      'This item has no Zenodo DOI. You need to generate or link one first with --newdoi.'
    );
    error = true;
  } else if (!zenodoRawItem) {
    console.log(`Zenodo item with id ${doi} does not exist.`);
    error = true;
  } else if (
    zenodoRawItem.related_identifiers &&
    zenodoRawItem.related_identifiers.length >= 1 &&
    zenodoRawItem.related_identifiers[0].identifier !== zoteroSelectLink
  ) {
    console.log(zoteroSelectLink);
    console.log(
      `The Zenodo item exists, but is not linked. You need to link the items with --zen ${doi} first.`
    );
    error = true;
  }
  return error;
}

function pushAttachment(itemKey, key, fileName, doi, groupId, userId) {
  if (args.debug) {
    console.log('DEBUG: pushAttachment');
  }
  console.log(`Pushing from Zotero to Zenodo: ${fileName}`);
  runCommand(
    `${groupId ? '--group-id ' + groupId : ''
    } attachment --key ${key} --save "../${fileName}"`
  );
  // TODO: What is the above command fails?
  // TODO: Also, I've inserted "..." in case the filename contains spaces. However, really the filename should be made shell-proof.
  // In perl, you would say:
  //                           use String::ShellQuote; $safefilename = shell_quote($filename);
  // There's no built-in for escaping. We can only escape special characters. We can do that if needed.
  // All the command failures will throw an exception which will be caught on the top-level and a message will be printed.
  const pushResult = runCommand(`upload ${doi} "../${fileName}"`, false);
  if (pushResult.status === 403) {
    console.log(pushResult.message);
    console.log('Creating new version.');
    const newVersionResponse = runCommand(`newversion ${doi}`, false);
    doi = doi.replace(
      /zenodo.*/,
      `zenodo.${parseFromZenodoResponse(newVersionResponse, 'latest_draft')
        .split('/')
        .slice(-1)[0]
      }`
    );
    linkZotZen(
      itemKey,
      doi,
      groupId,
      getZoteroSelectlink(userId || groupId, itemKey, !!groupId)
    );
    runCommand(`upload ${doi} "../${fileName}"`, false);
  }
  fs.unlinkSync(fileName);
  // TODO: How does the user know this was successful?
  console.log('Upload successfull.'); //This shoukd be good enough. User can always use --show or --open to see/open the record.
  return doi;
}

function linked(zenodoItem, zoteroLink) {
  if (args.debug) {
    console.log('DEBUG: linked');
  }
  return (
    zenodoItem.related_identifiers &&
    zenodoItem.related_identifiers.length >= 1 &&
    zenodoItem.related_identifiers[0].identifier === zoteroLink
  );
}

async function zotzenGet(args) {
  if (args.debug) {
    console.log('DEBUG: zotzenGet');
  }

  await Promise.all(
    args.zot.map(async (zot) => {
      let groupId = null;
      let itemKey = null;
      let userId = null;
      if (zot.includes('zotero')) {
        const selectLink = zot.split('/');
        if (selectLink.length < 7) {
          throw new Error('Invalid zotero select link specified');
        }
        if (selectLink[3] == 'users') {
          userId = selectLink[4];
        } else {
          groupId = selectLink[4];
        }
        itemKey = selectLink[6];
      } else if (zot.includes(':')) {
        groupId = zot.split(':')[0];
        itemKey = zot.split(':')[1];
      } else {
        itemKey = zot;
      }

      const zoteroItem = zoteroGet(groupId, userId, itemKey);
      let doi = null;
      if (zoteroItem.data.DOI) {
        doi = zoteroItem.data.DOI;
      } else {
        const doiRegex = new RegExp(/10\.5281\/zenodo\.[0-9]+/);
        if (zoteroItem.data.extra) {
          const match = zoteroItem.data.extra.match(doiRegex);
          if (match) {
            doi = match[0];
          }
        }
      }

      const zoteroSelectLink = getZoteroSelectlink(
        groupId || userId,
        itemKey,
        !!groupId
      );

      let zenodoRawItem = doi && zenodoGetRaw(doi);
      if (args.newdoi) {
        if (args.debug) {
          console.log('DEBUG: zotzenGet, newdoi');
        }
        if (doi) {
          console.log(`Item has DOI already: ${doi}`);
          console.log(
            `Linked zotero record: `,
            zenodoRawItem.related_identifiers[0].identifier
          );
        } else {
          const zenodoRecord = zenodoCreate(
            zoteroItem.data.title,
            zoteroItem.data.creators &&
            zoteroItem.data.creators.map((c) => {
              return {
                name: `${c.name ? c.name : c.lastName + ', ' + c.firstName}`,
              };
            }),
            zoteroSelectLink,
            args.template
          );
          doi = parseFromZenodoResponse(zenodoRecord, 'DOI');
          linkZotZen(itemKey, doi, groupId);
          console.log(`DOI allocated: ${doi}`);
        }
      } else if (args.zen) {
        if (args.debug) {
          console.log('DEBUG: zotzenGet, zen');
        }
        try {
          zenodoZenItem = zenodoGetRaw(args.zen);
        } catch (ex) {
          if (args.debug) {
            console.log('DEBUG: zotzenGet, exception zenodoGetRaw');
          }
        }
        if (doi) {
          console.log(`Item has DOI already: ${doi}`);
          console.log(
            `Linked zotero record: `,
            zenodoRawItem.related_identifiers[0].identifier
          );
        } else if (!zenodoZenItem) {
          console.log(`Zenodo item with id ${args.zen} does not exist.`);
        } else if (!linked(zenodoZenItem, zoteroSelectLink)) {
          console.log(
            'Zenodo item is linked to a different Zotero item: ',
            zenodoZenItem.related_identifiers[0].identifier
          );
        } else {
          const zenodoLinked = zenodoGet(args.zen);
          doi = zenodoLinked.doi;
          linkZotZen(itemKey, doi, groupId, zoteroSelectLink);
          console.log(`DOI allocated: ${doi}`);
        }
      } else if (args.sync || args.push || args.publish || args.link) {
        if (!doi) {
          console.log('No doi present in the zotero item.');
        } else if (linked(zenodoRawItem, zoteroSelectLink)) {
          console.log('Item is already linked.');
        } else if (
          zenodoRawItem.related_identifiers &&
          zenodoRawItem.related_identifiers.length >= 1 &&
          args.link
        ) {
          linkZotZen(itemKey, doi, groupId, zoteroSelectLink);
        } else {
          console.log(
            `Found doi: ${doi} not linked to zotero. Zotero: ${zoteroItem.data.title} Zenodo: ${zenodoRawItem.title} `
          );
          const result = await getPrompt({
            properties: {
              Link: {
                message: `Found doi: ${doi} not linked to zotero. Proceed? (y/N)`,
                default: 'y',
              },
            },
          });
          if (result && (result.Link == 'y' || result.Link == 'Y')) {
            console.log('Proceeding to link...');
            linkZotZen(itemKey, doi, groupId, zoteroSelectLink);
          }
        }
      }

      let zenodoItem = null;
      if (doi) {
        zenodoItem = zenodoGet(doi);
        zenodoRawItem = zenodoGetRaw(doi);
      }

      if (!zoteroItem.data.title) {
        console.log('Zotero item does not have title. Exiting...');
        return;
      }
      // This is useful is you just want the bare abstract.
      var abstract = '';
      if (
        !zoteroItem.data.abstractNote ||
        zoteroItem.data.abstractNote.length < 3
      ) {
        //console.log('Zotero item abstract is less than 3 characters. Exiting...');
        //return;
        console.log(
          'Zotero item abstract is less than 3 characters - using "No description available."'
        );
        abstract = 'No description available.';
      } else {
        abstract = zoteroItem.data.abstractNote;
      }
      if (!zoteroItem.data.creators || !zoteroItem.data.creators.length) {
        console.log('Zotero item does not have creators. Exiting...');
        return;
      }
      abstract += zoteroItem.data.url
        ? `\n\nAlso see: ${zoteroItem.data.url}`
        : '';
      if (args.sync) {
        if (!syncErrors(doi, zenodoRawItem, zoteroSelectLink)) {
          let updateDoc = {
            title: zoteroItem.data.title,
            description: abstract,
            creators: zoteroItem.data.creators.map((c) => {
              return {
                name: `${c.name ? c.name : c.lastName + ', ' + c.firstName}`,
              };
            }),
          };
          if (zoteroItem.data.date) {
            updateDoc.publication_date = zoteroItem.data.date;
          }
          runCommandWithJsonFileInput(
            `update ${doi} --json `,
            updateDoc,
            false
          );
        }
      }
    }

    )
  )
}


// This should not be needed as we're passing things through to the API.
async function finalActions() {
  //-- final actions
  if (args.publish && doi) {
    runCommand(`get ${doi} --publish`, false);
  }

  if (args.show) {
    console.log('Zotero:');
    console.log(`- Item key: ${itemKey}`);
    zoteroItem.data.creators.forEach((c) => {
      console.log(
        '-',
        `${c.creatorType}:`,
        c.name || c.firstName + ' ' + c.lastName
      );
    });
    console.log(`- Date: ${zoteroItem.data.date}`);
    console.log(`- Title: ${zoteroItem.data.title}`);
    console.log(`- DOI: ${doi}`);
    console.log('');

    if (doi) {
      zenodoRawItem = zenodoGetRaw(doi);
      zenodoItem = zenodoGet(doi);
      console.log('Zenodo:');
      console.log('* Item available.');
      console.log(`* Item status: ${zenodoItem.status}`);
      console.log(`* Item is ${zenodoItem.writable} writable`);
      console.log(`- Title: ${zenodoRawItem.title}`);
      zenodoRawItem.creators &&
        zenodoRawItem.creators.forEach((c) => {
          console.log(`- Author: ${c.name}`);
        });
      console.log(`- Publication date: ${zenodoRawItem.publication_date}`);
      console.log('');
    }
  }

  if (args.open) {
    opn(zoteroSelectLink);
    if (zenodoItem) {
      opn(zenodoItem.url);
    }
  }
}
