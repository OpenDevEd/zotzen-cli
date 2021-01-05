# Introduction: Tools for working with the APIs of Zotero and Zenodo (zotzen)

This repository is part of a set of repositories, see here: https://github.com/orgs/OpenDevEd/teams/zotzen-team/repositories. Currently, this set contains a number of libraries
- zenodo-lib https://github.com/opendeved/zenodo-lib, https://www.npmjs.com/package/zenodo-lib
- zotero-lib https://github.com/opendeved/zotero-lib, https://www.npmjs.com/package/zotero-lib
- zotzen-lib https://github.com/opendeved/zotzen-lib, https://www.npmjs.com/package/zotzzen-lib

The set contains some command-line tools:
- zenodo-cli https://github.com/opendeved/zenodo-cli, https://www.npmjs.com/package/zenodo-cli
- zotero-cli  https://github.com/opendeved/zotero-cli, https://www.npmjs.com/package/zotero-cli
- zotzen-cli  https://github.com/opendeved/zotzen-cli, https://www.npmjs.com/package/zotzen-cli

And a web application
- zotzen-web https://github.com/opendeved/zotzen-web

# zotzen

A commandline tool to exchange data between Zotero and Zenodo, using the respective APIs. Developed by [@bjohas](https://github.com/bjohas) and [@a1diablo](https://github.com/a1diablo).

Requires the following two tools (which are installed alongside):

- zenodo-cli from https://github.com/bjohas/zenodo-cli-python (deprecated) or https://github.com/bjohas/zenodo-cli-ts (maintained)
- zotero-cli from https://github.com/edtechhub/zotero-cli

## Setup - Simple

Run
```
sh install.sh
```
Enter your Zotero/Zenodo API credentials at the prompts and you are set.

## Setup - in detail (with https://github.com/bjohas/zenodo-cli-python)

The script `install.sh` runs this
```
git submodule update --init --recursive
cd zotero-cli
npm install
npm run build
cd ..
cd zenodo-cli
pip3 install -r requirements.txt
cd ..
npm install
node zotzen.js --install
```

After cloning this repository, pull the submodules

```
git submodule update --init --recursive
```

Make sure the dependent modules are built

```
cd zotero-cli
npm install
npm run build
cd ..

cd zenodo-cli
pip install -r requirements.txt
cd ..
```

You need to have config files set up

```
zotero-cli -> zotero-cli.toml
zenodo-cli -> config.json
```
which is done by running
```
node zotzen.js --install
```

Check whether you can log into both APIs, e.g. by running

```
zenodo-cli list
zotero-cli ???
```

## Use of zotzen

We're using `zotzen` as shorthand for `node zotzen.js`. You can set up a shortcut if you prefer.

### Create a new item on Zotero and Zenodo

Generate a new item pair:

```
zotzen --new --title "ABC"
```

Generate a new item pair in a specific Zotero group:

```
zotzen --new --group 123 --title "ABC"
```

This operation

- Generates a Zotero item with title "ABC"
- It registers a new record on Zenodo
- Attached the DOI for the record to Zotero.
- It prints out
  -- The Zotero ID: 123:XYZ
  -- The link to the Zotero id: https://...
  -- The Zotero-select link: zotero://...
  -- The Zenodo number: 678
  -- The Zenodo DOI: ..../...678
  -- The desposit link to Zenodo: https://....

If the option

```
--open
```

is specified then the Zenodo page and the Zotero page are opened in the browser.

As an alternative to `--title`, you can specify

```
--json record.json
```

in which case the `record.json` will be used to generate the record on Zotero.

### Typical work flow for existing Zotero items

A typical work flow for existing items would be:
```
zotzen zotero://select/groups/2405685/items/55A44ZRB --show --sync
zotzen zotero://select/groups/2405685/items/55A44ZRB --show --getdoi
zotzen zotero://select/groups/2405685/items/55A44ZRB --show --sync
zotzen zotero://select/groups/2405685/items/55A44ZRB --show --push
zotzen zotero://select/groups/2405685/items/55A44ZRB --show --publish
```
The next few sections go through this in detail.

### Check an existing zotero item

```
zotzen 2405685:55A44ZRB --show
```
For convenience you can also use, e.g.,
```
zotzen zotero://select/groups/2405685/items/55A44ZRB --show
```
or (if the group is set up in your config file)
```
zotzen 55A44ZRB --show
```

The Zotero item with item key ABC is fetched (from group 123) and
inspected. Output:

```
Zotero
- Item key: 123:ABC
- Title: ...
- DOI: ...
```

If there is a DOI (either in the DOI field or under
'extra'), and this DOI is a zenodo doi, the zenodo data is fetched. Output continues

```
Zenodo:
- Item available.
- Item status: ...
- Title: ...
- Item is [not] writable.
```

### Generate a DOI for an existing Zotero item

```
zotzen 123:ABC --getdoi [--template zenodo.json]
```

The Zotero item with item key ABC is fetched (from group 123) and
inspected.

(1) If there is a DOI, then:

```
Item has DOI already: <DOI>
```

If that's a Zenodo DOI, inspect the Zenodo DOI and see whether the reference in the item is back to the same Zotero item. Print the result.

(2) If there isn't a DOI, the item data is put into Zenodo format (basic
use of title, abstract, date and authors only, for now). Additional fields are filled
form the `zenodo.json` if provided. Response:

```
DOI allocated: <DOI>
```

The DOI is written to the Zotero item. I.e., ttach the resulting DOI
to the Zotero record (to the DOI field or to extra if no DOI
field). The Zotero item ID is written to the Zenodo record as above.

### Linking a Zotero item to an existing Zenodo item

```
zotzen 123:ABC --zen 567
```

The Zotero item with item key ABC is fetched (from group 123) and
inspected.

If there is

- no DOI in the Zotero item
- AND the zenodo item with key 567 exists,
- AND the zenodo item does not link to a different Zotero item

then: the items as linked, i.e., the DOI derived from the zenodo item
key 567 is added to the zotero item. The Zotero item id is added to
the Zenodo item as above.

### Sync metadata from zotero to zenodo

```
zotzen 123:ABC --sync
```

- The zotero item metadata is retrieved (as with `--show`).
-- If there's no Zenodo DOI, abort with "This item has no Zenodo DOI. You need to generate or link one first with --getdoi."
-- Check the Zenodo item, and check it links back to the Zotero item. If not, abort with "The Zenodo item exists, but is not linked. You need to link the items with --zen XXX first."
- Then, the Zotero metadata is written to Zenodo item (as above for `--getdoi`).

### Push Zotero attachments to Zenodo.

```
zotzen 123:ABC --push [--types pdf|all]
```

The attachments to ABC are attached to the record
-- `--type pdf` (default) attached PDF files only.
-- `--type all` attached all.

### Combinations

The options `--getdoi`, `--sync` and `--push` can be combined.

```
zotzen 123:ABC --getdoi --sync --push
```

or

```
zotzen 123:ABC --zen 456 --sync --push
```

Also, publish the Zenodo record:

```
zotzen [...] --publish
```

Also, open the webpage for the Zenodo record:

```
zotzen [...] --open
```

# Note

This tools doesn't allow you to go from Zenodo to Zotero. You've
already got the browser plugin for Zotero, and you can easily use that
on a Zenodo page. So not much need for this tool to go the other way.

# Also note

Going from Zotero json to Zenodo json is not necessarily straight
forward. We can make some compromises here, such as manually setting
up the Zenodo item (or using zenodo.json) and only syncing the most
common Zotero properties (title, author, abstract, date).


# Further notes

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
