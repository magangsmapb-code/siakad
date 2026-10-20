// @ts-check
import { module } from "@prisma/composer";
import frontendService from "./frontend/service.mjs";

export default module("siakad", ({ provision }) => {
  provision(frontendService);
});
