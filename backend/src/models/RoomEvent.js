import mongoose from 'mongoose';

const { Schema } = mongoose;

const RoomEventSchema = new Schema({
  linkId: {
    type: String,
    required: true,
    ref: 'ConferenceLink',
    index: true,
  },
  event: {
    type: String,
    enum: ['created', 'participant_joined', 'participant_left', 'ended', 'expired', 'track_published'],
    required: true,
  },
  participantIdentity: {
    type: String,
    default: null,
  },
  participantCount: {
    type: Number,
    required: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound index for query performance when pulling events for a specific link sorted by time
RoomEventSchema.index({ linkId: 1, timestamp: -1 });

const RoomEvent = mongoose.model('RoomEvent', RoomEventSchema);

export default RoomEvent;
