export const TRUSTED_ATTRIBS = [
  ":data",
  ":for",
  ":text",
  ":html",
  ":show",
  ":class",
  ":bind",
  ":on:click",
  ":on:click.prevent",
  ":on:input",
  ":on:input.prevent",
  ":on:change",
  ":on:change.prevent",
  ":on:submit",
  ":on:submit.prevent",
  ":attr:src",
  ":attr:href",
  ":attr:title",
  ":prop:checked",
  ":prop:selected",
  ":prop:disabled",
];

const colonToData = (attr: string) => `data-${attr.slice(1).replace(":", "-")}`;

export const TRUSTED_DATA_ATTRIBS = TRUSTED_ATTRIBS.map((attr) => colonToData(attr));

export const ADDITIONAL_DATA_ATTRIBS = ["data-testid"];

export const SAFE_DATA_ATTRIBS = [...TRUSTED_DATA_ATTRIBS, ...ADDITIONAL_DATA_ATTRIBS];
