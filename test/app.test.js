const test = require('tape');

const fs = require('fs').promises;
const { readCAR, readBlock } = require('fast-ipfs');

const storage = require('../src/storage/fs');
const { computeHash } = require('../src/util/hash');
const app = require('../app');
const request = require('supertest')(app.callback());

test('/', async t => {
    const { status, text } = await request.get('/');
    t.isEqual(status, 200);
    t.match(text, /vgrichina\/nearfs/);
});

test('/ipfs/:cid not found', async t => {
    const { status } = await request.get('/ipfs/bafkreib3mbbrhmal34xx7loxzxc4ue36y5rg7wvc24xwryg2j2ozek3p4y');
    t.isEqual(status, 404);
});

test('/ipfs/:cid/:path not found', async t => {
    const { status } = await request.get('/ipfs/bafkreib3mbbrhmal34xx7loxzxc4ue36y5rg7wvc24xwryg2j2ozek3p4y/index.html');
    t.isEqual(status, 404);
});

test('/ipfs/:cid hello.car', async t => {
    await loadCar('test/data/hello.car');

    const { status, text } = await request.get('/ipfs/bafybeicit72w2sl3agal2jftpkrzwd773fjgdk4dym7pq2pbojyif72v5e');
    t.isEqual(status, 200);
    t.isEqual(text, 'Hello, World\n');
});

test('/ipfs/:cid/:path hello.car not found', async t => {
    await loadCar('test/data/hello.car');

    const { status } = await request.get('/ipfs/bafybeicit72w2sl3agal2jftpkrzwd773fjgdk4dym7pq2pbojyif72v5e/no-such-file');
    t.isEqual(status, 404);
});

test('/ipfs/:cid/:path big.car', async t => {
    await loadCar('test/data/big.car');

    const { status, body } = await request.get('/ipfs/bafybeiaietzjdt4rsu2mk6qfymye5bgockic43pwsfm25lchld5wrj5gjq/big/file');
    t.isEqual(status, 200);
    t.isEqual(body.length, 1024 * 1024);
    t.true(body.every(b => b === 0, 'body is all zeros'));
});

test('/ipfs/:cid/:path big.car range', async t => {
    // TODO: Range support
});

test('/ipfs/:cid/:path littlelink.car not found', async t => {
    await loadCar('test/data/littlelink.car');

    const { status } = await request.get('/ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/dist/');
    t.isEqual(status, 404);
});

function flattenHtml(html) {
    return html.split('\n').map(line => line.trim()).join('\n');
}

test('/ipfs/:cid littlelink.car directory listing', async t => {
    await loadCar('test/data/littlelink.car');

    const { status, text } = await request.get('/ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/');
    t.isEqual(status, 200);
    t.isEqual(flattenHtml(text), flattenHtml(`
        <html>
            <head>
                <title>Index of /ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/</title>
            </head>
            <body>
                <h1>Index of /ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/</h1>
                <ul>
                    <li><a href="/ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/css">css</a></li>
                    <li><a href="/ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/deploy.js">deploy.js</a></li>
                    <li><a href="/ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/images">images</a></li>
                    <li><a href="/ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/privacy.html">privacy.html</a></li>
                    <li><a href="/ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/web-wallet-api.js">web-wallet-api.js</a></li>
                </ul>
            </body>
        </html>
    `));
});

test('/ipfs/:cid/:path littlelink.car serve deeper listing', async t => {
    await loadCar('test/data/littlelink.car');

    const { status, text } = await request.get('/ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/images/');
    t.isEqual(status, 200);
    t.isEqual(flattenHtml(text), flattenHtml(`
        <html>
            <head>
                <title>Index of /ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/images/</title>
            </head>
            <body>
                <h1>Index of /ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/images/</h1>
                <ul>
                    <li><a href="/ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/images/avatar.png">avatar.png</a></li>
                    <li><a href="/ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/images/avatar.svg">avatar.svg</a></li>
                    <li><a href="/ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/images/avatar@2x.png">avatar@2x.png</a></li>
                    <li><a href="/ipfs/bafybeiepywlzwr2yzyin2bo7k2v5oi37lsgleyvfrf6erjvlze2qec6wkm/images/icons">icons</a></li>
                </ul>
            </body>
        </html>
    `));
});

test('/ipfs/:cid/:path web4.car serve index.html', async t => {
    await loadCar('test/data/web4.car');

    const { status, text } = await request.get('/ipfs/bafybeidg3ohf4kscsf6cjbgg7vttcvu7q4olena3kwhpl5wl3trhhougyi/dist/');
    t.isEqual(status, 200);
    t.match(text, /<title>web4: Unstoppable websites on NEAR blockchain and IPFS\/Filecoin.<\/title>/);
});

test('/ipfs/:cid/:path web4.car redirect if directory misses /', async t => {
    await loadCar('test/data/web4.car');

    const { status, text, headers } = await request.get('/ipfs/bafybeidg3ohf4kscsf6cjbgg7vttcvu7q4olena3kwhpl5wl3trhhougyi/dist');
    t.isEqual(status, 301);
    t.isEqual(headers.location, '/ipfs/bafybeidg3ohf4kscsf6cjbgg7vttcvu7q4olena3kwhpl5wl3trhhougyi/dist/');
    t.isEqual(text, '<a href="/ipfs/bafybeidg3ohf4kscsf6cjbgg7vttcvu7q4olena3kwhpl5wl3trhhougyi/dist/">Moved Permanently</a>.');
});

test('/ipfs/:cid/:path web4.car serve css and detect mime from extension', async t => {
    await loadCar('test/data/web4.car');

    const { status, headers } = await request.get('/ipfs/bafybeidg3ohf4kscsf6cjbgg7vttcvu7q4olena3kwhpl5wl3trhhougyi/dist/normalize.css');
    t.isEqual(status, 200);
    t.match(headers['content-type'], /^text\/css/);
});

async function loadCar(carFile) {
    const carData = await fs.readFile(carFile);
    const [, ...rawBlocks] = await readCAR(carData);
    for (const rawBlock of rawBlocks) {
        const block = await readBlock(rawBlock.data);
        const hash = await computeHash(block.data);
        await storage.writeBlock(hash, block.data);
    }
}
