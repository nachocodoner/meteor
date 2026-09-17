import assert from "assert";
import { define } from "../tool-testing/selftest";
import { loadIsopackage } from "../tool-env/isopackets";

const collection = "retainedDocuments";
const id = "retained-document";

// Load the checkout's real DDP processor and helpers through its tool isopacket.
// Only the transport and document store are fixtures: no network or database.
async function fixture({ original, optimistic, methods = [], reset = false }) {
  const { DDP } = await loadIsopackage("ddp-client");
  const { IdMap } = await loadIsopackage("id-map");
  const connection = DDP.connect({
    on() {},
    send() {},
    disconnect() {},
    status() { return { status: "connected" }; },
  }, { heartbeatInterval: 0, bufferedWritesInterval: 0 });
  let document = structuredClone(optimistic);
  const visible = [];
  connection.registerStoreClient(collection, {
    getDoc() { return structuredClone(document); },
    beginUpdate(count, shouldReset) {
      if (shouldReset) document = undefined;
    },
    update(message) {
      assert.strictEqual(message.id, id);
      if (message.msg === "added") {
        document = { ...structuredClone(message.fields), _id: id };
      } else {
        assert.strictEqual(message.msg, "replace");
        document = structuredClone(message.replace);
      }
    },
  });
  connection._resetStores = reset;
  const serverDoc = {
    document: structuredClone(original),
    writtenByStubs: Object.fromEntries(methods.map(method => [method, true])),
    flushCallbacks: [],
  };
  if (methods.length) {
    connection._serverDocuments[collection] = new IdMap();
    connection._serverDocuments[collection].set(id, serverDoc);
    for (const method of methods) {
      connection._documentsWrittenByStub[method] = [{ collection, id }];
      connection._methodInvokers[method] = {
        sentMessage: true,
        dataVisible() { visible.push(method); },
      };
    }
  }
  return {
    connection,
    serverDoc,
    visible,
    document: () => document,
    async process(message) {
      const updates = {};
      await connection._messageProcessors._processOneDataMessage(message, updates);
      connection._performWritesClient(updates);
      return updates;
    },
    close: () => connection.close(),
  };
}

define("ddp retained document partial adds preserve pending stubs", async function () {
  const original = { _id: id, name: "old", owner: "owner", items: [], obsolete: true };
  const optimistic = { ...original, items: ["offline edit"] };
  const state = await fixture({ original, optimistic, methods: ["5", "6"] });
  try {
    assert.deepStrictEqual(await state.process({
      msg: "added", collection, id, fields: { name: "server", obsolete: undefined },
    }), {});
    assert.deepStrictEqual(state.document(), optimistic);
    assert.deepStrictEqual(state.serverDoc.document, {
      _id: id, name: "server", owner: "owner", items: [],
    });
    assert.deepStrictEqual(await state.process({ msg: "updated", methods: ["5"] }), {});
    assert.deepStrictEqual(state.document(), optimistic);
    assert.deepStrictEqual(state.visible, []);

    await state.process({
      msg: "changed", collection, id, fields: { items: ["confirmed edit"] },
    });
    assert.deepStrictEqual(state.document(), optimistic);
    const expected = { _id: id, name: "server", owner: "owner", items: ["confirmed edit"] };
    assert.deepStrictEqual(await state.process({ msg: "updated", methods: ["6"] }), {
      [collection]: [{ msg: "replace", id, replace: expected }],
    });
    assert.deepStrictEqual(state.document(), expected);
    assert.deepStrictEqual(state.visible, ["5", "6"]);
    assert.strictEqual(state.connection._getServerDoc(collection, id), null);
  } finally {
    state.close();
  }
});

for (const fields of [undefined, {}]) {
  define(`ddp retained document ${fields ? "empty" : "fieldless"} adds preserve snapshot`, async function () {
    const original = { _id: id, name: "server", items: [] };
    const optimistic = { ...original, items: ["offline edit"] };
    const state = await fixture({ original, optimistic, methods: ["5"] });
    try {
      const message = { msg: "added", collection, id };
      if (fields) message.fields = fields;
      assert.deepStrictEqual(await state.process(message), {});
      assert.deepStrictEqual(state.serverDoc.document, original);
      assert.deepStrictEqual(state.document(), optimistic);
      await state.process({ msg: "updated", methods: ["5"] });
      assert.deepStrictEqual(state.document(), original);
    } finally {
      state.close();
    }
  });
}

define("ddp retained document reset adds preserve optimistic store", async function () {
  const original = { _id: id, name: "old", obsolete: true };
  const optimistic = { ...original, name: "offline edit" };
  const state = await fixture({ original, optimistic, methods: ["5"], reset: true });
  try {
    assert.deepStrictEqual(await state.process({
      msg: "added", collection, id, fields: { name: "server" },
    }), { [collection]: [{ msg: "added", collection, id, fields: optimistic }] });
    assert.deepStrictEqual(state.document(), optimistic);
    assert.deepStrictEqual(state.serverDoc.document, { _id: id, name: "server" });
    assert.strictEqual(state.connection._resetStores, false);
    await state.process({ msg: "updated", methods: ["5"] });
    assert.deepStrictEqual(state.document(), { _id: id, name: "server" });
  } finally {
    state.close();
  }
});

define("ddp retained document new adds still reach store", async function () {
  const state = await fixture({});
  try {
    const message = { msg: "added", collection, id, fields: { name: "new" } };
    assert.deepStrictEqual(await state.process(message), { [collection]: [message] });
    assert.deepStrictEqual(state.document(), { _id: id, name: "new" });
  } finally {
    state.close();
  }
});

define("ddp retained document first server add waits for inserting stub", async function () {
  const optimistic = { _id: id, name: "offline insert" };
  const state = await fixture({ optimistic, methods: ["5"] });
  try {
    assert.deepStrictEqual(await state.process({
      msg: "added", collection, id, fields: { name: "server insert" },
    }), {});
    assert.deepStrictEqual(state.document(), optimistic);
    await state.process({ msg: "updated", methods: ["5"] });
    assert.deepStrictEqual(state.document(), { _id: id, name: "server insert" });
  } finally {
    state.close();
  }
});
