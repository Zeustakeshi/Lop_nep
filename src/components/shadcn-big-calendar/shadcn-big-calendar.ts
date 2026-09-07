import { Calendar } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./shadcn-big-calendar.css";

const ShadcnBigCalendar = Calendar;
export const ShadcnDragAndDropCalendar = withDragAndDrop(Calendar);

export default ShadcnBigCalendar;
