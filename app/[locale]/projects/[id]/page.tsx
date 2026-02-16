import { notFound } from 'next/navigation';
import ProjectDetails from '@/components/projects/ProjectDetails';
import { projects } from '@/lib/data/projects';

export default async function ProjectDetailPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  const project = projects.find(p => p.id === parseInt(id));
  
  if (!project) {
    notFound();
  }
  
  return <ProjectDetails project={project as any} locale={resolvedParams.locale} />;
}
