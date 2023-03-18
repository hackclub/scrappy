import { reply } from "../lib/api-utils.js";
import { t } from "../lib/transcript.js";
import prisma from "../lib/prisma.js";

// Only runs when a user uploads a large video, to notify them when Mux processes the video

export const mux = {
  path: "/mux",
  method: ["GET"],
  handler: async (req, res) => {
    if (req.body.type === "video.asset.ready") {
      const assetId = req.body.object.id;
      const videoUpdate = (
        await prisma.updates.findMany({
          where: {
            muxAssetIDs: {
              contains: assetId,
            },
          },
        })
      )[0];
      const largeVideo = videoUpdate.isLargeVideo;
      if (largeVideo) {
        const ts = videoUpdate.messageTimestamp;
        const user = videoUpdate.accountsSlackID;
        reply(process.env.CHANNEL, ts, t("messages.assetReady", { user }));
      }
    }
    res.status(200).end();
  },
};
