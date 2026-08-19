export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only")
    return { url: "data:text/javascript,export%20{}", shortCircuit: true };
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") && !specifier.endsWith(".ts"))
      return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
}
