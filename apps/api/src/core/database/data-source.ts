import "reflect-metadata";
import { DataSource } from "typeorm";

import { buildTypeOrmOptions } from "./typeorm-options.js";

const appDataSource = new DataSource(buildTypeOrmOptions());

export default appDataSource;
