import { useParams } from "react-router-dom";

export default function BookDetails() {
  const { id } = useParams();

  return <h1>Book Details for ID: {id}</h1>;
}