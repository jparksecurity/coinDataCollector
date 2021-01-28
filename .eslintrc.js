module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ["airbnb-base", "plugin:prettier/recommended"],
  rules: {
    "new-cap": ["error", { newIsCapExceptions: ["bithumb", "upbit"] }],
  },
};
