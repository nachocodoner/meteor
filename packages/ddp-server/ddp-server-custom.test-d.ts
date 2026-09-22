import { expectTypeOf } from "expect-type";
import { DDPServer } from "meteor/ddp-server";

expectTypeOf(DDPServer.publicationStrategies.CUSTOM)
  .toEqualTypeOf<DDPServer.PublicationStrategy>();
expectTypeOf(DDPServer.publicationStrategies.CUSTOM.noSendRemoves)
  .toEqualTypeOf<boolean | undefined>();
const ordinaryStrategy: DDPServer.PublicationStrategy = {
  useDummyDocumentView: false,
  useCollectionView: true,
  doAccountingForCollection: true,
};
const customStrategy: DDPServer.PublicationStrategy = {
  ...ordinaryStrategy,
  noSendRemoves: true,
};
expectTypeOf(customStrategy.noSendRemoves).toEqualTypeOf<boolean | undefined>();
