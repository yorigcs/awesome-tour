# @awesome-tour/codemod

Migrate tours from react-joyride, Shepherd and driver.js to [awesome-tour](https://yorigcs.github.io/awesome-tour/).

```sh
npx @awesome-tour/codemod joyride src/
npx @awesome-tour/codemod shepherd src/
npx @awesome-tour/codemod driver src/   # add --dry --print to preview
```

Step definitions are rewritten in place; anything that needs a human gets a
`// TODO(awesome-tour): …` comment. Guide: https://yorigcs.github.io/awesome-tour/guides/migrating/
