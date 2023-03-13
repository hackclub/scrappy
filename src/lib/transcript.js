import fs from "fs";
import yaml from "js-yaml";

// ex. t('greeting', { userID: 'UX12U391' })

export const t = (search, vars) => {
  if (vars) {
    console.log(
      `I'm searching for words in my yaml file under "${search}". These variables are set: ${JSON.stringify(
        vars
      )}`
    );
  } else {
    console.log(`I'm searching for words in my yaml file under "${search}"`);
  }
  const searchArr = search.split(".");
  const transcriptObj = yaml.load(
    fs.readFileSync(path.join(process.cwd(), "src/lib/transcript.yml"), "utf-8")
  );
  return evalTranscript(recurseTranscript(searchArr, transcriptObj), vars);
};

const recurseTranscript = (searchArr, transcriptObj, topRequest) => {
  topRequest = topRequest || searchArr.join(".");
  const searchCursor = searchArr.shift();
  const targetObj = transcriptObj[searchCursor];
  if (!targetObj) {
    return topRequest;
  }
  if (searchArr.length > 0) {
    return recurseTranscript(searchArr, targetObj, topRequest);
  } else {
    if (Array.isArray(targetObj)) {
      return sample(targetObj);
    } else {
      return targetObj;
    }
  }
};

const evalTranscript = (target, vars = {}) => {
  const context = {
    ...vars,
    t,
  };
  return function () {
    return eval("`" + target + "`");
  }.call(context);
};
