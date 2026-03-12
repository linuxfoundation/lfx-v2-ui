# Shared Types Reference

## Location

All shared types live in `packages/shared/src/`:

- **Interfaces:** `interfaces/<name>.interface.ts`
- **Enums:** `enums/<name>.enum.ts`
- **Constants:** `constants/<name>.constants.ts`

## Conventions

- License header required on all new files
- Use TypeScript interfaces (not union types) for better maintainability
- Use `as const` for constant objects to get literal types
- Export from the barrel file (`index.ts`) in the same directory
- NEVER define interfaces locally in component or service files — always in `@lfx-one/shared/interfaces`

## File Naming

```text
packages/shared/src/
├── interfaces/
│   ├── my-feature.interface.ts    # TypeScript interfaces
│   └── index.ts                   # Barrel export
├── enums/
│   ├── my-feature.enum.ts         # Enumerations
│   └── index.ts
└── constants/
    ├── my-feature.constants.ts    # Constant objects with `as const`
    └── index.ts
```

## Usage

```typescript
import { MyInterface } from '@lfx-one/shared/interfaces';
import { MyEnum } from '@lfx-one/shared/enums';
import { MY_CONSTANT } from '@lfx-one/shared/constants';
```

## Checklist

- [ ] File has license header
- [ ] File uses correct suffix (`.interface.ts`, `.enum.ts`, `.constants.ts`)
- [ ] Exported from barrel `index.ts`
- [ ] Interfaces use `interface`, not `type` unions
- [ ] Constants use `as const` for literal types
