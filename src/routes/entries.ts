import { Router } from "express";
import { requireLogin, requireUnlocked } from "../middleware";
import { entriesController } from "../controllers/entries";

export const entriesRouter = Router();

entriesRouter.use(requireLogin);
entriesRouter.use(requireUnlocked);

entriesRouter.get("/", entriesController.list);
entriesRouter.get("/:id", entriesController.get);
entriesRouter.post("/", entriesController.create);
entriesRouter.put("/:id", entriesController.update);
entriesRouter.delete("/:id", entriesController.remove);
