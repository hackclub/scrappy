export const getReactionRecord = async (emoji, updateId) =>
  await prisma.emojiReactions.findFirst({
    where: {
      emojiTypeName: emoji,
      updateId: updateId,
    },
  });

export const reactBasedOnKeywords = (channel, message, ts) => {
  Object.keys(emojiKeywords).forEach(async (keyword) => {
    if (
      message
        .toLowerCase()
        .search(new RegExp("\\b" + keyword + "\\b", "gi")) !== -1
    ) {
      await react("add", channel, ts, emojiKeywords[keyword]);
    }
  });
};
