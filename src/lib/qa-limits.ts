// Size limits for Q&A pages. In their own file so the browser-side form can use
// them without loading the validation code (which pulls in the HTML parser).
export const MAX_QUESTION_LENGTH = 300;
export const MAX_ANSWER_LENGTH = 5000;
export const MAX_QA_PAIRS = 50;
