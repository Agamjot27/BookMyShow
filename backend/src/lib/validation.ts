import type { Request } from "express";
import { z } from "zod";
import { ApiError } from "./api-error.js";

type Source = "body" | "query" | "params";
type Options = {
  source?: Source;
  // Auth historically returns this message with empty details for a non-object body.
  objectErrorMessage?: string;
};

export function parseInput<S extends z.ZodType>(
  schema: S, input: unknown, options: Options = {},
): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const source = options.source ?? "body";
  const details: Record<string, string> = Object.create(null);
  let message = "Check the submitted fields";
  for (const issue of result.error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        const field = [...issue.path, key].map(String).join(".");
        details[field] = source === "query" ? "Unexpected query parameter" : "Unexpected field";
      }
    } else if (!issue.path.length && issue.code === "invalid_type") {
      if (options.objectErrorMessage) message = options.objectErrorMessage;
      else details[source] = source === "body" ? "A JSON object is required" : issue.message;
    } else {
      const field = issue.path.length ? issue.path.map(String).join(".") : source;
      // Preserve the first (most fundamental) failure for each field.
      if (!Object.hasOwn(details, field)) details[field] = issue.message;
    }
  }
  throw new ApiError(400, "VALIDATION_ERROR", message, details);
}

/** Return typed parsed data without assigning to Express 5's read-only req.query. */
export function parseRequest<S extends z.ZodType>(
  req: Pick<Request, Source>, source: Source, schema: S,
  options: Omit<Options, "source"> = {},
): z.output<S> {
  return parseInput(schema, req[source], { ...options, source });
}
