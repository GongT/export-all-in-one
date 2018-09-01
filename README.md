# export-all-in-one

1. Resolve ALL files from a tsconfig.json
1. Collect ALL exported thing from these files
1. Join ALL of them into a single _index.ts
1. (You can) Setup `rollup` _index.ts as entry

1. **BOOM**, everything exported. everyone can `import {anything} from '@your/package'`.
