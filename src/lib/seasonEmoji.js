import createSeasonResolver from "date-season"

var seasonNorth = createSeasonResolver();

export const SEASON_EMOJI =
  seasonNorth(new Date()) == "Spring"
    ? "spring-of-making"
    : seasonNorth(new Date()) == "Summer"
    ? "summer-making"
    : seasonNorth(new Date()) == "Winter"
    ? "wom"
    : "aom";
