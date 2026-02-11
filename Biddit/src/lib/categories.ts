export type CategoryGroup = {
  label: string;
  options: { value: string; label: string }[];
};

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Home Improvement",
    options: [
      { value: "Roofing", label: "Roofing" },
      { value: "Plumbing", label: "Plumbing" },
      { value: "Electrical", label: "Electrical" },
      { value: "HVAC", label: "HVAC" },
      { value: "Kitchen Remodel", label: "Kitchen Remodel" },
      { value: "Bathroom Remodel", label: "Bathroom Remodel" },
      { value: "Flooring", label: "Flooring" },
      { value: "Painting", label: "Painting" },
      { value: "Drywall", label: "Drywall" },
      { value: "Handyman", label: "Handyman" },
    ],
  },
  {
    label: "Outdoor & Yard",
    options: [
      { value: "Landscaping", label: "Landscaping" },
      { value: "Lawn Care", label: "Lawn Care" },
      { value: "Tree Service", label: "Tree Service" },
      { value: "Pressure Washing", label: "Pressure Washing" },
      { value: "Gutter Cleaning", label: "Gutter Cleaning" },
      { value: "Fence & Deck", label: "Fence & Deck" },
    ],
  },
  {
    label: "Cleaning & Moving",
    options: [
      { value: "House Cleaning", label: "House Cleaning" },
      { value: "Deep Cleaning", label: "Deep Cleaning" },
      { value: "Move-in/Move-out Cleaning", label: "Move-in/Move-out Cleaning" },
      { value: "Car Wash/Detailing", label: "Car Wash/Detailing" },
      { value: "Moving Help", label: "Moving Help" },
      { value: "Junk Removal", label: "Junk Removal" },
    ],
  },
  {
    label: "Pets",
    options: [
      { value: "Dog Walking", label: "Dog Walking" },
      { value: "Pet Sitting", label: "Pet Sitting" },
      { value: "Grooming", label: "Grooming" },
      { value: "Training", label: "Training" },
    ],
  },
  {
    label: "Lessons & Personal",
    options: [
      { value: "Tutoring", label: "Tutoring" },
      { value: "Music Lessons", label: "Music Lessons" },
      { value: "Fitness Training", label: "Fitness Training" },
      { value: "Computer Help", label: "Computer Help" },
    ],
  },
  { label: "Other", options: [{ value: "General", label: "General" }] },
];

export const DEFAULT_CATEGORY = "General";
