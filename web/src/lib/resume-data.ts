import type { Education, Experience } from "./types";
import { validPublishDate } from "./project-date";
export function formatResumeDate(value?: string): string {
  const date = validPublishDate(value);
  return date
    ? date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";
}
export function resumeSections(
  experiences: Experience[],
  educations: Education[],
) {
  const sort = (a: Experience, b: Experience) => {
    const endA =
      a.current || !a.endDate
        ? Infinity
        : (validPublishDate(a.endDate)?.getTime() ?? 0);
    const endB =
      b.current || !b.endDate
        ? Infinity
        : (validPublishDate(b.endDate)?.getTime() ?? 0);
    return (
      (endA === endB ? 0 : endB - endA) ||
      (validPublishDate(b.startDate)?.getTime() ?? 0) -
        (validPublishDate(a.startDate)?.getTime() ?? 0)
    );
  };
  const derivedEducations: Education[] = educations.length
    ? educations
    : experiences
        .filter((e) => e.id === "ucf-cs")
        .map((e) => ({
          id: e.id,
          institution: e.companyName,
          degree: e.role,
          startDate: e.startDate,
          endDate: e.endDate,
          current: e.current,
          location: e.location,
          description: e.description,
          highlights: e.highlights,
        }));
  return {
    jobs: experiences.filter((e) => e.type === "job").sort(sort),
    renownedProjects: experiences
      .filter((e) => e.type === "renowned")
      .sort(sort),
    derivedEducations,
    volunteerWork: experiences
      .filter(
        (e) =>
          e.type === "volunteer" &&
          !(educations.length === 0 && e.id === "ucf-cs"),
      )
      .sort(sort),
  };
}
