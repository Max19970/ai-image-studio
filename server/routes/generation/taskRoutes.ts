import type express from 'express';
import type multer from 'multer';
import { sendServerError } from '../../http/errors';
import {
  defaultGenerationTaskRuntimePort,
  type GenerationTaskRuntimePort
} from '../../processes/generation-task-runtime/runtimePort';
import { parseBatchGenerationRunRequest, parseSingleGenerationRunRequest } from './requestParsing';

const tasksBasePath = '/api/generation-tasks';

function sendNoContent(res: express.Response) {
  res.status(204).end();
}

export function registerGenerationTaskRoutes(
  app: express.Express,
  upload: multer.Multer,
  runtime: GenerationTaskRuntimePort = defaultGenerationTaskRuntimePort
) {
  app.get(`${tasksBasePath}/events`, (req, res) => {
    try {
      runtime.subscribeEvents(req, res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post(`${tasksBasePath}/run`, upload.any(), async (req, res) => {
    try {
      const task = await runtime.startSingle(parseSingleGenerationRunRequest(req));
      res.status(202).json({ taskId: task.id, task });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post(`${tasksBasePath}/batch`, upload.any(), async (req, res) => {
    try {
      const task = await runtime.startBatch(parseBatchGenerationRunRequest(req));
      res.status(202).json({ taskId: task.id, task });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post(`${tasksBasePath}/clear`, async (_req, res) => {
    try {
      await runtime.clearAll();
      sendNoContent(res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post(`${tasksBasePath}/delete`, async (req, res) => {
    try {
      const taskId = typeof req.body?.taskId === 'string' ? req.body.taskId : '';
      await runtime.removeOne(taskId);
      sendNoContent(res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.delete(tasksBasePath, async (_req, res) => {
    try {
      await runtime.clearAll();
      sendNoContent(res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.delete(`${tasksBasePath}/:taskId`, async (req, res) => {
    try {
      await runtime.removeOne(req.params.taskId);
      sendNoContent(res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post(`${tasksBasePath}/:taskId/cancel`, async (req, res) => {
    try {
      await runtime.stopTask(req.params.taskId);
      sendNoContent(res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post(`${tasksBasePath}/:taskId/batch-items/:itemId/cancel`, async (req, res) => {
    try {
      await runtime.stopBatchItem(req.params.taskId, req.params.itemId);
      sendNoContent(res);
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
