// Claude via Bedrock — calls Supabase edge function proxy (AWS creds stay server-side)
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ─── Tool registry ────────────────────────────────────────────────────────────

export function buildTools({ supabase, apps, outreach, items, notes, log, qc }) {
  const invalidate = (keys) => keys.forEach((k) => qc.invalidateQueries([k]));

  return [
    // ── Applications ────────────────────────────────────────────────────────
    {
      name: "create_application",
      description: "Add a new application or grant to the tracker",
      schema: z.object({
        name:             z.string(),
        type:             z.enum(["Accelerator","Grant","VC / Angel","Partnership","Academic"]),
        region:           z.string().optional(),
        amount:           z.string().optional(),
        status:           z.enum(["Not Yet Applied","Applied","In Progress","Accepted","Rejected","Pending"]).optional(),
        priority:         z.enum(["Critical","High","Medium","Low"]).optional(),
        fund_description: z.string().optional(),
        next_step:        z.string().optional(),
        notes:            z.string().optional(),
        deadline:         z.string().optional().describe("YYYY-MM-DD"),
        contact_name:     z.string().optional(),
        owner:            z.string().optional(),
      }),
      run: async (args) => {
        const { data } = await supabase.from("applications").insert({
          ...args, status: args.status ?? "Not Yet Applied", priority: args.priority ?? "Medium",
          owner: args.owner ?? "Jason", deadline: args.deadline || null,
        }).select().single();
        await log({ action: "AI: created application", entityType: "application", entityId: data.id, entityName: args.name });
        invalidate(["applications","activity_log"]);
        return `Created application: ${args.name}`;
      },
    },
    {
      name: "update_application",
      description: "Update fields on an existing application by UUID",
      schema: z.object({
        id:               z.string().describe("UUID of the application"),
        name:             z.string().optional(),
        type:             z.enum(["Accelerator","Grant","VC / Angel","Partnership","Academic"]).optional(),
        region:           z.string().optional(),
        amount:           z.string().optional(),
        status:           z.enum(["Not Yet Applied","Applied","In Progress","Accepted","Rejected","Pending"]).optional(),
        priority:         z.enum(["Critical","High","Medium","Low"]).optional(),
        fund_description: z.string().optional(),
        next_step:        z.string().optional(),
        notes:            z.string().optional(),
        deadline:         z.string().nullable().optional(),
        contact_name:     z.string().optional(),
        owner:            z.string().optional(),
      }),
      run: async ({ id, ...fields }) => {
        await supabase.from("applications").update(fields).eq("id", id);
        const name = apps.find((a) => a.id === id)?.name ?? id;
        await log({ action: `AI: updated ${Object.keys(fields).join(", ")}`, entityType: "application", entityId: id, entityName: name });
        invalidate(["applications","activity_log"]);
        return `Updated: ${name}`;
      },
    },
    {
      name: "delete_application",
      description: "Delete an application by UUID",
      schema: z.object({ id: z.string() }),
      run: async ({ id }) => {
        const name = apps.find((a) => a.id === id)?.name ?? id;
        await supabase.from("applications").delete().eq("id", id);
        await log({ action: "AI: deleted application", entityType: "application", entityId: id, entityName: name });
        invalidate(["applications","activity_log"]);
        return `Deleted: ${name}`;
      },
    },

    // ── Outreach ─────────────────────────────────────────────────────────────
    {
      name: "create_outreach",
      description: "Add a new outreach contact",
      schema: z.object({
        name:         z.string(),
        role:         z.string().optional(),
        region:       z.string().optional(),
        status:       z.enum(["Active","Pending","Warm","Cold","Done"]).optional(),
        last_contact: z.string().optional().describe("YYYY-MM-DD"),
        notes:        z.string().optional(),
        next_step:    z.string().optional(),
        owner:        z.string().optional(),
      }),
      run: async (args) => {
        const { data } = await supabase.from("outreach").insert({
          ...args, status: args.status ?? "Warm", owner: args.owner ?? "Jason", last_contact: args.last_contact || null,
        }).select().single();
        await log({ action: "AI: created contact", entityType: "outreach", entityId: data.id, entityName: args.name });
        invalidate(["outreach","activity_log"]);
        return `Created contact: ${args.name}`;
      },
    },
    {
      name: "update_outreach",
      description: "Update fields on an existing contact by UUID",
      schema: z.object({
        id:           z.string(),
        name:         z.string().optional(),
        role:         z.string().optional(),
        region:       z.string().optional(),
        status:       z.enum(["Active","Pending","Warm","Cold","Done"]).optional(),
        last_contact: z.string().nullable().optional(),
        notes:        z.string().optional(),
        next_step:    z.string().optional(),
        owner:        z.string().optional(),
      }),
      run: async ({ id, ...fields }) => {
        await supabase.from("outreach").update(fields).eq("id", id);
        const name = outreach.find((c) => c.id === id)?.name ?? id;
        await log({ action: `AI: updated ${Object.keys(fields).join(", ")}`, entityType: "outreach", entityId: id, entityName: name });
        invalidate(["outreach","activity_log"]);
        return `Updated: ${name}`;
      },
    },
    {
      name: "delete_outreach",
      description: "Delete a contact by UUID",
      schema: z.object({ id: z.string() }),
      run: async ({ id }) => {
        const name = outreach.find((c) => c.id === id)?.name ?? id;
        await supabase.from("outreach").delete().eq("id", id);
        await log({ action: "AI: deleted contact", entityType: "outreach", entityId: id, entityName: name });
        invalidate(["outreach","activity_log"]);
        return `Deleted: ${name}`;
      },
    },

    // ── Action Items ──────────────────────────────────────────────────────────
    {
      name: "create_action_item",
      description: "Add a new task or action item",
      schema: z.object({
        title:       z.string(),
        description: z.string().optional(),
        owner:       z.string().optional(),
        due_date:    z.string().optional().describe("YYYY-MM-DD"),
        status:      z.enum(["To Do","In Progress","Done"]).optional(),
        priority:    z.enum(["Critical","High","Medium","Low"]).optional(),
        week_label:  z.string().optional().describe("Group name"),
      }),
      run: async (args) => {
        const groupItems = items.filter((i) => i.week_label === args.week_label);
        const maxOrder = groupItems.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1);
        const { data } = await supabase.from("action_items").insert({
          ...args,
          status: args.status ?? "To Do",
          priority: args.priority ?? "High",
          owner: args.owner ?? "Jason",
          due_date: args.due_date || null,
          sort_order: maxOrder + 1,
        }).select().single();
        await log({ action: "AI: created task", entityType: "action_item", entityId: data.id, entityName: args.title });
        invalidate(["action_items","activity_log"]);
        return `Created task: ${args.title}`;
      },
    },
    {
      name: "update_action_item",
      description: "Update fields on an existing task by UUID. Use for changing status, priority, owner, due date, group, etc.",
      schema: z.object({
        id:          z.string(),
        title:       z.string().optional(),
        description: z.string().optional(),
        owner:       z.string().optional(),
        due_date:    z.string().nullable().optional(),
        status:      z.enum(["To Do","In Progress","Done"]).optional(),
        priority:    z.enum(["Critical","High","Medium","Low"]).optional(),
        week_label:  z.string().optional(),
        sort_order:  z.number().optional(),
      }),
      run: async ({ id, ...fields }) => {
        await supabase.from("action_items").update(fields).eq("id", id);
        // Look up title: from local cache, from fields if being renamed, or from DB
        let name = fields.title ?? items.find((i) => i.id === id)?.title;
        if (!name) {
          const { data } = await supabase.from("action_items").select("title").eq("id", id).single();
          name = data?.title ?? id;
        }
        await log({ action: `AI: updated ${Object.keys(fields).join(", ")}`, entityType: "action_item", entityId: id, entityName: name });
        invalidate(["action_items","activity_log"]);
        return `Updated task: ${name}`;
      },
    },
    {
      name: "delete_action_item",
      description: "Delete a task by UUID",
      schema: z.object({ id: z.string() }),
      run: async ({ id }) => {
        const name = items.find((i) => i.id === id)?.title ?? id;
        await supabase.from("action_items").delete().eq("id", id);
        await log({ action: "AI: deleted task", entityType: "action_item", entityId: id, entityName: name });
        invalidate(["action_items","activity_log"]);
        return `Deleted task: ${name}`;
      },
    },

    // ── Team Notes ────────────────────────────────────────────────────────────
    {
      name: "create_team_note",
      description: "Save something to the shared team knowledge base. Use when the user says 'remember', 'note that', 'save this', or shares context the team should retain.",
      schema: z.object({
        title:    z.string().describe("Short, searchable title"),
        body:     z.string().describe("Full content — self-contained so it makes sense when read in isolation"),
        category: z.enum(["Contact","Context","Rule","Fundraising","Engineering","Research","General"]),
      }),
      run: async (args) => {
        const { data: { session } } = await supabase.auth.getSession();
        const created_by = session?.user?.email?.split("@")[0] ?? "AI";
        const { data } = await supabase.from("team_notes").insert({ ...args, created_by }).select().single();
        await log({ action: "AI: saved to knowledge base", entityType: "team_note", entityId: data.id, entityName: args.title });
        invalidate(["team_notes","activity_log"]);
        return `Saved to knowledge base: ${args.title}`;
      },
    },
    {
      name: "update_team_note",
      description: "Update an existing knowledge base note by UUID",
      schema: z.object({
        id:       z.string(),
        title:    z.string().optional(),
        body:     z.string().optional(),
        category: z.enum(["Contact","Context","Rule","Fundraising","Engineering","Research","General"]).optional(),
      }),
      run: async ({ id, ...fields }) => {
        await supabase.from("team_notes").update(fields).eq("id", id);
        const name = notes.find((n) => n.id === id)?.title ?? id;
        await log({ action: "AI: updated knowledge note", entityType: "team_note", entityId: id, entityName: name });
        invalidate(["team_notes","activity_log"]);
        return `Updated: ${name}`;
      },
    },
    {
      name: "delete_team_note",
      description: "Delete a knowledge base note by UUID",
      schema: z.object({ id: z.string() }),
      run: async ({ id }) => {
        const name = notes.find((n) => n.id === id)?.title ?? id;
        await supabase.from("team_notes").delete().eq("id", id);
        await log({ action: "AI: deleted knowledge note", entityType: "team_note", entityId: id, entityName: name });
        invalidate(["team_notes","activity_log"]);
        return `Deleted: ${name}`;
      },
    },
  ];
}

// ─── System prompt ────────────────────────────────────────────────────────────

export function buildSystemPrompt(apps, outreach, items, notes) {
  const groups = [...new Set(items.map((i) => i.week_label).filter(Boolean))];
  return `You are the IOLA AI assistant for Ikirere Orbital Labs Africa — a deep tech space startup building satellite coordination software and CubeSats for Africa.

You have FULL access to the team's live operations data. Use tools to make changes. Keep text responses concise.

${notes.length > 0 ? `════ TEAM KNOWLEDGE BASE (READ FIRST) ════
${notes.map((n) => `[${n.category.toUpperCase()}] ${n.title}\n${n.body}`).join("\n\n---\n\n")}
═════════════════════════════════════════

` : ""}APPLICATIONS (${apps.length}):
${apps.map((a) => `[${a.id}] ${a.name} | ${a.type} | ${a.status} | ${a.priority} | ${a.amount || "—"} | deadline:${a.deadline || "none"} | owner:${a.owner || "—"}`).join("\n")}

OUTREACH (${outreach.length}):
${outreach.map((c) => `[${c.id}] ${c.name} | ${c.role || "—"} | ${c.status} | last:${c.last_contact || "—"} | next:${c.next_step || "—"} | owner:${c.owner || "—"}`).join("\n")}

TASKS (${items.length}):
${items.map((i) => `[${i.id}] ${i.title} | ${i.owner || "—"} | ${i.status} | ${i.priority} | due:${i.due_date || "—"} | group:${i.week_label || "ungrouped"}`).join("\n")}

GROUPS: ${groups.length ? groups.join(", ") : "none yet"}

When the user says "remember", "note that", "save this" — use create_team_note.`;
}

// ─── Main ask function ────────────────────────────────────────────────────────

function cleanSchema(schema) {
  // Strip fields Bedrock rejects, ensure type:object is present
  const { $schema, additionalProperties, ...rest } = schema;
  return {
    type: "object",
    ...rest,
    // Recursively clean nested property schemas
    ...(rest.properties ? {
      properties: Object.fromEntries(
        Object.entries(rest.properties).map(([k, v]) => {
          const { $schema: _, ...clean } = v;
          return [k, clean];
        })
      )
    } : {}),
  };
}

export async function askClaude({ userMessage, systemPrompt, tools, supabase, conversationHistory = [] }) {
  // Convert tool registry to Anthropic/Bedrock tool format
  const anthropicTools = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: cleanSchema(zodToJsonSchema(t.schema, { $refStrategy: "none" })),
  }));

  const { data: { session } } = await supabase.auth.getSession();

  const callProxy = async (messages) => {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-proxy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          system: systemPrompt,
          tools: anthropicTools,
          messages,
          max_tokens: 2048,
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? err?.error?.type ?? `Proxy error ${res.status}`);
    }
    return res.json();
  };

  // Agentic loop — full conversation history + current message
  const messages = [...conversationHistory, { role: "user", content: userMessage }];
  const toolResults = [];
  let text = "";

  for (let i = 0; i < 5; i++) {
    const response = await callProxy(messages);

    // Collect text from this turn
    const turnText = (response.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (turnText) text = turnText;

    // If no tool calls, we're done
    const toolUseBlocks = (response.content ?? []).filter((b) => b.type === "tool_use");
    if (toolUseBlocks.length === 0) break;

    // Execute each tool call
    const toolResultContent = [];
    for (const block of toolUseBlocks) {
      const toolDef = tools.find((t) => t.name === block.name);
      const result = toolDef
        ? await toolDef.run(block.input).catch((e) => `Error: ${e.message}`)
        : `Unknown tool: ${block.name}`;
      toolResults.push(result);
      toolResultContent.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: String(result),
      });
    }

    // Append assistant turn + tool results for next loop
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResultContent });
  }

  return { text, toolResults };
}
