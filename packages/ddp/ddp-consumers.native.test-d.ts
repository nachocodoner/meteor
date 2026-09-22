import { expectTypeOf } from "expect-type";
import { DDP } from "meteor/ddp-client";
import { DDPCommon } from "meteor/ddp-common";
import { DDPServer } from "meteor/ddp-server";
import {
  DDP as LegacyDDP,
  DDPCommon as LegacyDDPCommon,
  DDPServer as LegacyDDPServer,
} from "meteor/ddp";
import type { Meteor } from "meteor/meteor";

expectTypeOf(DDP).toEqualTypeOf<typeof LegacyDDP>();
expectTypeOf(DDPCommon).toEqualTypeOf<typeof LegacyDDPCommon>();
expectTypeOf(DDPServer).toEqualTypeOf<typeof LegacyDDPServer>();

const connection = DDP.connect("http://localhost:3000", { retry: false });
expectTypeOf(connection.close()).toBeVoid();
expectTypeOf(connection.callAsync<string>("parse", { fixtureId: "fixture" }))
  .toEqualTypeOf<Promise<string>>();

const reconnectHandle = DDP.onReconnect((reconnected) => {
  expectTypeOf(reconnected).toEqualTypeOf<DDP.DDPStatic>();
});
expectTypeOf(reconnectHandle.stop()).toBeVoid();
expectTypeOf<DDP.DDPStatic["onReconnect"]>()
  .toEqualTypeOf<(() => void | Promise<void>) | null>();
connection.onReconnect = async () => {};
connection.onReconnect();
// @ts-expect-error The per-connection hook is not a registration method.
connection.onReconnect(() => {});
connection.onReconnect = null;
// @ts-expect-error The per-connection hook receives no connection argument.
connection.onReconnect = (reconnected: DDP.DDPStatic) => {};

const invocation = new DDPCommon.MethodInvocation({
  connection: null,
  isSimulation: false,
  name: "parse",
  randomSeed: "seed",
  userId: "user-id",
  async setUserId(userId) {
    expectTypeOf(userId).toEqualTypeOf<string | null>();
  },
});
expectTypeOf(invocation.connection).toEqualTypeOf<Meteor.Connection | null | undefined>();
expectTypeOf(invocation.setUserId(null)).toEqualTypeOf<Promise<void>>();

const stubInvocation = new DDPCommon.MethodInvocation({
  isSimulation: true,
  isFromCallAsync: true,
  userId: null,
  randomSeed: () => "lazy-seed",
});
expectTypeOf(stubInvocation.connection)
  .toEqualTypeOf<Meteor.Connection | null | undefined>();

const serverInvocation = new DDPCommon.MethodInvocation({
  connection: null,
  isSimulation: false,
  userId: null,
  randomSeed: null,
  unblock() {},
  fence: {},
});
expectTypeOf(serverInvocation.unblock()).toBeVoid();
