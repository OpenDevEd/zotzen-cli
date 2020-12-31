
const ArgumentParser = require('argparse').ArgumentParser;
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

zotzen install
zotzen create [previously 'new']
zotzen link
zotzen push

// ---------------------------------------------------------
zotzen -h 
-h, --help Show this help message and exit.
-v, --verbose 
--debug Enable debug logging
--zenodoconfig CONFIGFILE
--zoteroconfig CONFIGFILE

--show Show the zotero, zenodo item information
--open Open the zotero and zenodo link after creation
--dump

create  Create a new pair of Zotero/Zenodo entries.
init    install Install the config for Zotero and Zenodo.
link
push

// ---------------------------------------------------------
zotzen create -h 

zotzen create [--title ... ... --json ...] --group ...
Create a new zotero and a new zenodo record and link them.

TODO: This option should have the same option as 'zenodo-cli create', e.g.
--title TITLE Title of the new entries (for --new).
--template TEMPLATE Path of the template to be used for creating Zenodo record.
--json JSON A Zotero or Zenodo json file to be used for the Zotero entry

Other than zenodo-cli, there is one more option:
--group GROUP Group ID for which the new item Zotero is to be created


// ---------------------------------------------------------
zotzen link -h

zotzen link zotero_id --newdoi
zotzen link zotero_id zenodo_id

Link an existing zotero item to a new zenodo record or link it with with an existing zenodo record in the DOI. 

--newdoi Generate a DOI for an existing Zotero item.


Use cases:
1. You have a zotero item already, and you want to get a DOI for it. (--newdoi)
2. You have a zotero item already and you have a zenodo item already, and you want to use the existing DOI for the zotero item.

ERROR MESSAGES:

(1) Running "zotzen link zotero_id --newdoi" where zotero_id already has a DOI, results in error message:

The Zotero item has a Zenodo DOI already. If you really want to link
this to a new record in Zenodo, please manually remove the DOI
first. You can use the --open option to open the Zotero/Zenodo items
to make adjustments.)

(2a) Running "zotzen link zotero_id zenodo_id" where zotero_id already
has a DOI (which is different from zenodo_id), results in error
message above.  

(2b) If the Zenodo item is linked against a different Zotero item,
then:

The Zenodo item is already linked with a different Zotero item. Do you
want to proceed? y/n?

(3) Running "zotzen link zotero_id zenodo_id" where zotero_id already
has a DOI which MATCHES zenodo_id, and where zenodo_id is already
linked to the same zotero item:

The Zotero item and the Zenodo item are already linked.

// ---------------------------------------------------------
zotzen push -h

zotzen push zotero_id
--metadata      Sync metadata from zotero to zenodo. [Previously --sync]
--attachments   Push Zotero attachments to Zenodo. [Rename to --push]
--type TYPE     Type of the attachments to be pushed (e.g., PDF, DOCX, etc)
--publish       Publish zenodo record. One or more positional arguments (zotero items)

This option requires items to be linked already (e.g., using zotzen link).

Error message if the item is unlinked: The Zotero item XYZ is not linked to a Zenodo item. Please link it first:

zotzen link XYZ --newdoi
zotzen link XYZ -123

*/


const parser = new ArgumentParser({
  version: '1.0.0',
  addHelp: true,
  description: 'ZotZen utility. Main modes are --new or provide a Zotero item.',
});



/*
New parser
*/

const parser = new argparse.ArgumentParser({ "description": "Zenodo command line utility" });
parser.add_argument(
  "--zoteroconfig", {
    "action": "store",
    "default": "zotero-cli.toml",
    "help": "Config file with API key. By default config.json then ~/.config/zotero-cli/zotero-cli.toml are used if no config is provided."
  });
parser.add_argument(
  "--verbose", {
    "action": "store_false",
    "help": "Run in verbose mode"
  });
parser.addArgument(
  '--debug', {
    action: 'storeTrue',
    help: 'Enable debug logging',
  });
parser_create.addArgument(
  '--show', {
    action: 'storeTrue',
    help: 'Show the Zotero and Zenodo item information',
  });
parser_create.addArgument(
  '--open', {
    action: 'storeTrue',
    help:
    'Open the Zotero and Zenodo link after creation (both on web).',
  });
parser_create.addArgument(
  '--oapp', {
    action: 'storeTrue',
    help:
    'Open the Zotero link (app) and the Zenodo link after creation (web).',
});
parser_create.add_argument(
  "--dump", {
    "action": "store_true",
    "help": "Show json for list and for depositions after executing the command.",
    "default": false
  });

const subparsers = parser.add_subparsers({ "help": "sub-command help" });
const parser_create = subparsers.add_parser("create",
  { "help": "Create a new pair of Zotero/Zenodo entries. Note: If you already have a Zotero item, use 'link' instead." });
parser_create.addArgument('--title', {
  help: 'Title of the new entry.',
});
parser_create.addArgument('--json', {
  help: 'A Zotero/Zenodo json file to be used for the new entry.',
});
parser_create.addArgument('--group', {
  help: 'Group ID for which the new item Zotero is to be created. (Can be provided via Zotero config file.)',
});


const parser_init = subparsers.add_parser(
  "init",
  {   "help": "Set up config files for Zotero/Zenodo in the default location." } );

const parser_link = subparsers.add_parser(
  "link", {
    nargs: 1,
    "help": "Get a DOI for a Zotero item or link a Zotero item to an existing Zenodo item. Provide the Zotero item as first argument."
  });

parser_link.addArgument(
  '--newdoi', {
    action: 'storeTrue',
    help: 'Generate a DOI for an existing Zotero item.',
  });

parser_link.addArgument(
  '--zenodo', {
    nargs: 1,
    help: 'Zenodo record id of the item to be linked.',
  });

const parser_push = subparsers.add_parser("init",
  { "help": "Set up config files for Zotero/Zenodo in the default location." });

parser_push.addArgument('--sync', {
  action: 'storeTrue',
  help: 'Sync metadata from zotero to zenodo.',
});
parser_push.addArgument('--push', {
  action: 'storeTrue',
  help: 'Push Zotero attachments to Zenodo.',
});
parser_push.addArgument('--type', {
  action: 'store',
  help: 'Type of the attachments to be pushed.',
  defaultValue: 'all',
});
parser_push.addArgument('--publish', {
  action: 'storeTrue',
  help: 'Publish zenodo record.',
});


const args = parser.parseArgs();

const zoteroPrefix = 'node bin/zotero-cli.js';
const zenodoPrefix = 'python zenodo-cli.py';
const zoteroSelectPrefix = 'zotero://select';
const zoteroApiPrefix = 'https://api.zotero.org';
const zoteroTmpFile = 'zotero-cli/tmp';
const zenodoTmpFile = 'zenodo-cli/tmp';
const zenodoCreateRecordTemplatePath = 'zenodo-cli/template.json';

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


/*
// TODO
Replace runCommand with two functions:
- zenodoAPI
- zoteroAPI

*/

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
    } catch (_) {}
    throw new Error(`${zotero ? 'Zotero' : 'Zenodo'}: ${ex.output.toString()}`);
  }
}

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

function zoteroCreate(title, group, jsonFile = null) {
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

function zotzenCreate(args) {
  if (args.debug) {
    console.log('DEBUG: zotzenCreate');
  }
  const zoteroRecord = zoteroCreate(args.title, args.group, args.json);
  const zoteroSelectLink = zoteroRecord.successful[0].links.self.href.replace(
    zoteroApiPrefix,
    zoteroSelectPrefix
  );

  const zenodoRecord = zenodoCreate(
    zoteroRecord.successful[0].data.title,
    zoteroRecord.successful[0].data.creators,
    zoteroSelectLink
  );
  const doi = parseFromZenodoResponse(zenodoRecord, 'DOI');
  const zenodoDepositUrl = parseFromZenodoResponse(zenodoRecord, 'URL');

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

  if (args.open) {
    opn(zoteroSelectLink);
    opn(zenodoDepositUrl);
  }
}

function zoteroGet(groupId, userId, itemKey) {
  if (args.debug) {
    console.log('DEBUG: zoteroGet');
  }
  return JSON.parse(
    runCommand(
      `${groupId ? '--group-id ' + groupId : ''} ${
        userId ? '--user-id ' + userId : ''
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
    `${
      groupId ? '--group-id ' + groupId : ''
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
      `zenodo.${
        parseFromZenodoResponse(newVersionResponse, 'latest_draft')
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

      if (args.push) {
        if (!syncErrors(doi, zenodoRawItem, zoteroSelectLink)) {
          const children = JSON.parse(
            runCommand(
              `${
                groupId ? '--group-id ' + groupId : ''
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
    })
  );
}

try {
  if (args.new) {
    if (args.debug) {
      console.log('DEBUG: args.new');
    }
    zotzenCreate(args);
  } else if (args.install) {
    if (args.debug) {
      console.log('DEBUG: args.install');
    }
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
  } else {
    zotzenGet(args).catch((ex) => {
      if (args.debug) {
        console.log(ex);
      }
    });
  }
} catch (ex) {
  if (args.debug) {
    console.log('DEBUG: ERROR');
  }
  if (args.debug) {
    console.log(ex);
  }
}
