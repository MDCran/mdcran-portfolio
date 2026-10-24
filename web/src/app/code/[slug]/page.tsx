import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CodeProjectRedirect({ params }: Props) {
  const { slug } = await params;
  if (!/^[a-z0-9-]+$/i.test(slug)) permanentRedirect("/engineering");
  permanentRedirect(`/engineering/${slug}`);
}
