import { expectTypeOf } from "expect-type";
import { Meteor } from "meteor/meteor";
import { DDP } from "meteor/ddp-client";

const handle = Meteor.subscribe("subscription-handle-fixture");
expectTypeOf(handle.subscriptionId).toEqualTypeOf<string>();

const connectionHandle = DDP.connect("http://localhost:3000")
  .subscribe("subscription-handle-fixture");
expectTypeOf(connectionHandle.subscriptionId).toEqualTypeOf<string>();

// @ts-expect-error Every DDP subscription handle includes its subscription ID.
const missingId: Meteor.SubscriptionHandle = { ready: () => false, stop() {} };
// @ts-expect-error The public handle property is subscriptionId, not id.
handle.id;
