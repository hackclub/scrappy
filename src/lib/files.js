import S3 from "../lib/s3";

const { Video } = new Mux(
  process.env.MUX_TOKEN_ID,
  process.env.MUX_TOKEN_SECRET
);

const isFileType = (types, fileName) =>
  types.some((el) => fileName.toLowerCase().endsWith(el));

export const getPublicFileUrl = async (urlPrivate, channel, user) => {
  const fileName = urlPrivate.split("/").pop();
  const fileId = urlPrivate.split("-")[2].split("/")[0];
  const isImage = isFileType(["jpg", "jpeg", "png", "gif"], fileName);
  const isAudio = isFileType(["mp3", "wav", "aiff", "m4a"], fileName);
  const isVideo = isFileType(["mp4", "mov", "webm"], fileName);
  if (fileName.toLowerCase().endsWith("heic")) return { url: "heic" };
  if (!(isImage || isAudio | isVideo)) return null;
  const file = await fetch(urlPrivate, {
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
  });
  let blob = await file.blob();
  if (blob.size === 19) {
    const publicFile = app.client.files.sharedPublicURL({
      file: fileId,
    });
    const pubSecret = publicFile.file.permalink_public.split("-").pop();
    const directUrl = `https://files.slack.com/files-pri/T0266FRGM-${fileId}/${fileName}?pub_secret=${pubSecret}`;
    if (isVideo) {
      postEphemeral(channel, t("messages.errors.bigvideo"), user);
      await timeout(30000);
      const asset = await Video.Assets.create({
        input: directUrl,
        playback_policy: "public",
      });
      return {
        url: "https://i.imgur.com/UkXMexG.mp4",
        muxId: asset.id,
        muxPlaybackId: asset.playback_ids[0].id,
      };
    } else {
      await postEphemeral(channel, t("messages.errors.imagefail"));
      return { url: directUrl };
    }
  }
  if (isVideo) {
    let form = new FormData();
    form.append("file", blob.stream(), {
      filename: fileName,
      knownLength: blob.size,
    });
    const uploadedUrl = await fetch("https://bucky.hackclub.com", {
      method: "POST",
      body: form,
    }).then((r) => r.text());
    const asset = await Video.Assets.create({
      input: uploadedUrl,
      playback_policy: "public",
    });
    return {
      url: uploadedUrl,
      muxId: asset.id,
      muxPlaybackId: asset.playback_ids[0].id,
    };
  }
  let uploadedImage = await S3.upload({
    Bucket: "scrapbook-into-the-redwoods",
    Key: `${uuidv4()}-${fileName}`,
    Body: blob.stream(),
  }).promise();
  return {
    url: uploadedImage.location,
    muxId: null,
    muxPlaybackId: null,
  };
};
