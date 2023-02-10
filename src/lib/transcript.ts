import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

type TranscriptObj = Record<string, unknown>;
type VarObj = Record<string, string | number | boolean>;

const sample = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

// ex. t('greeting', { userID: 'UX12U391' })
export const t = (search: string, vars: VarObj = {}) => {
	if (vars) {
		console.log(`I'm searching for words in my yaml file under "${search}". These variables are set: ${JSON.stringify(vars)}`);
	} else {
		console.log(`I'm searching for words in my yaml file under "${search}"`);
	}
	const searchArr = search.split('.');
	const transcriptObj = yaml.load(fs.readFileSync(path.join(process.cwd(), 'src/lib/transcript.yml'), 'utf-8')) as TranscriptObj; // this needs to be cached

	return evalTranscript(recurseTranscript(searchArr, transcriptObj), vars);
};

const recurseTranscript = (searchArr: string[], transcriptObj: TranscriptObj, topRequest?: string): string => {
	topRequest = topRequest || searchArr.join('.');
	const searchCursor = searchArr.shift();
	if (!searchCursor) throw `Couldn't parse cursor`;

	const targetObj = transcriptObj[searchCursor] as string | string[] | TranscriptObj | undefined;

	if (!targetObj) return topRequest as string; //if not found, return the key

	if (searchArr.length > 0) {
		return recurseTranscript(searchArr, targetObj as TranscriptObj, topRequest);
	} else {
		if (Array.isArray(targetObj)) {
			return sample(targetObj);
		} else {
			return targetObj as string;
		}
	}
};

const evalTranscript = (target: string, vars: VarObj = {}) => {
	const context = {
		...vars,
		t
	};
	return function () {
		return eval('`' + target + '`');
	}.call(context);
};
