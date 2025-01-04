import { Box } from '@mui/material';
import Moment from 'moment';
import { extendMoment } from 'moment-range';
import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndProp from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { slotApiSlice as slotApi } from '../../app/services/slotApiSlice';
import * as SlotStatusConstants from '../../common/constants/slotStatus';
import {
  IsCalendarSlotWithinAvailableTimes,
  isOverlapped,
  isWithinAvailableTimes,
} from '../../common/util/slotUtil';
import CustomEventComponent from './CustomEventComponent';
import {
  selectStudentAvailableSlots,
  selectUnschedulingSlots,
} from './slotSlice';

const moment = extendMoment(Moment);
const localizer = momentLocalizer(Moment);
const timeFormat = 'YYYY-MM-DD[T]HH:mm:ss';
const DnDCalendar = withDragAndProp(Calendar);

export default function ScheduleCalendar({
  height,
  allSlots,
  draggedStudent,
  setDraggedStudent,
  selectedStudent,
  setSelectedStudent,
}) {
  const studentAvailableSlots = useSelector(selectStudentAvailableSlots);
  const unschedulingSlots = useSelector(selectUnschedulingSlots);
  const dispatch = useDispatch();
  const [planningSlots, setPlanningSlots] = useState([]);

  const slotPropGetter = useCallback(
    (date) => {
      const style = {
        borderLeft: '2px solid green',
        borderRight: '2px solid green',
      };
      const student = draggedStudent == null ? selectedStudent : draggedStudent;
      if (student == null) {
        return;
      }

      const ret = IsCalendarSlotWithinAvailableTimes(
        studentAvailableSlots[student] ?? [],
        moment(date)
      );

      if (!ret.isAvailable) {
        return;
      }
      // todo: dynamically set color

      if (ret.isStart) {
        style.borderTop = '2px solid green';
        style.borderRadius = '5px 5px 0 0';
      }
      if (ret.isEnd) {
        style.borderBottom = '2px solid green';
        style.borderRadius = '0 0 5px 5px';
      }
      return { style };
    },
    [selectedStudent, draggedStudent, studentAvailableSlots]
  );

  const onChangeSlotTime = useCallback(
    (start, end, id) => {
      // if (
      //   isOverlapped(pendingSlots, start, end, id) ||
      //   !isAppointmentWithinAvailableTimes(availableSlots[10], start, end)
      // ) {
      //   // todo: notifications
      //   return;
      // }
      if (
        !isWithinAvailableTimes(
          studentAvailableSlots[draggedStudent] ?? [],
          start,
          end
        ) ||
        isOverlapped([...unschedulingSlots, ...planningSlots], start, end, id)
      ) {
        return;
      }
      setPlanningSlots((prev) => {
        let slot = prev.find((slot) => slot.id === id);
        slot.start = start;
        slot.end = end;
        return prev;
      });

      dispatch(
        slotApi.util.updateQueryData('getSlots', { coachId: 10 }, (slots) => {
          let slot = slots.find((slot) => slot.id === id);
          if (slot) {
            slot.start = moment(start).format(timeFormat);
            slot.end = moment(end).format(timeFormat);
          }
        })
      );
    },
    [setPlanningSlots, draggedStudent, unschedulingSlots, planningSlots]
  );

  const onDropFromOutside = useCallback(
    ({ start, end }) => {
      // By default, each class's duration is 1 hour
      end = moment(end).add(0.5, 'hours');
      // console.log(start);
      // console.log(end);
      if (
        !isWithinAvailableTimes(
          studentAvailableSlots[draggedStudent] ?? [],
          start,
          end
        )
      ) {
        return;
      }
      setPlanningSlots((prev) => [
        ...prev,
        {
          id: uuidv4(),
          studentId: draggedStudent,
          start: moment(start).toDate(),
          end: end.toDate(),
          status: SlotStatusConstants.PLANNING,
          isDraggable: true,
        },
      ]);
      // dispatch(
      //   slotApi.util.updateQueryData('getSlots', { coachId: 10 }, (slots) => {
      //     slots.push({
      //       id: draggedStudent.id,
      //       start: moment(start).format(timeFormat),
      //       end: end.format(timeFormat),
      //       status: SlotStatusConstants.PLANNING,
      //       isDraggable: true,
      //     });
      //   })
      // );
    },
    [
      studentAvailableSlots,
      draggedStudent,
      isWithinAvailableTimes,
      setPlanningSlots,
    ]
  );

  const dragFromOutsideItem = useCallback(() => null, []);

  useEffect(() => {
    console.log(allSlots);
  }, [allSlots]);

  /**
   * Need to figure out
   * 1. how to diplay preview that takes more than 1 slot
   * 2. when deleting a slot, the preview seems to still exist
   * before actually using dragFromOutsideItem
   */
  return (
    <Box style={{ height }}>
      <DnDCalendar
        localizer={localizer}
        events={[...unschedulingSlots, ...planningSlots]}
        draggableAccessor="isDraggable"
        dragFromOutsideItem={dragFromOutsideItem}
        views={['month', 'week']}
        defaultView="week"
        onEventDrop={({ start, end, event }) => {
          const { id, status } = event;
          if (status === SlotStatusConstants.PLANNING) {
            setDraggedStudent(null);
          }
          if (start.getDay() === end.getDay()) {
            onChangeSlotTime(start, end, id);
          }
        }}
        resizable={false}
        selectable={false}
        onDropFromOutside={onDropFromOutside}
        onDragStart={(e) => {
          const { studentId, status } = e.event;
          if (status === SlotStatusConstants.PLANNING) {
            setDraggedStudent(studentId);
          }
        }}
        slotPropGetter={slotPropGetter}
        components={{
          event: (props) => (
            <CustomEventComponent
              setPlanningSlots={setPlanningSlots}
              setSelectedStudent={setSelectedStudent}
              {...props}
            />
          ),
        }}
      />
    </Box>
  );
}
