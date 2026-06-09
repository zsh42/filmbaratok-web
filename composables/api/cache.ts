export async function revalidateEpisode(slug?: string): Promise<void> {
  try {
    await $fetch('/_revalidate/episode', {
      method: 'POST',
      body: { slug },
    })
  } catch {
    // best-effort: a failed revalidation must not block admin UX
  }
}
